
import { useState, useEffect, useRef } from "react";
import { Machine, LogEntry, LogRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  Download, 
  Terminal as TerminalIcon, 
  FileText,
  RefreshCw,
  ArrowDown
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/utils/dateUtils";
import { Input } from "@/components/ui/input";
import { sshService } from "@/services/sshService";

interface LogViewerProps {
  machine: Machine;
}

const LogViewer = ({ machine }: LogViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [terminalCommand, setTerminalCommand] = useState<string>("");
  const [terminalOutput, setTerminalOutput] = useState<string>("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeView, setActiveView] = useState<"logs" | "terminal">("logs");
  
  const liveIntervalRef = useRef<number>();
  const logContainerRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalOutputRef = useRef<HTMLDivElement>(null);

  // MobaXterm style color management
  const getColorForComponent = (component: string): string => {
    if (!component) return "text-gray-400";
    
    // Color mapping similar to MobaXterm
    if (component.includes("DCT:VIST")) return "text-cyan-300";
    if (component.includes("BP")) return "#f0ad4e"; // yellow-orange
    if (component.includes("MAIN")) return "text-green-400";
    if (component.includes("MQ")) return "text-purple-400";
    if (component.includes("LPR")) return "text-cyan-400";
    if (component.includes("CAP")) return "text-sky-400";
    if (component.includes("admin_pipeline")) return "text-pink-400";
    if (component.includes("sh")) return "text-gray-400";
    
    // Default color for unknown components
    return "text-gray-300";
  };

  // Get text color for log level
  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case "error": return "text-red-500";
      case "warning": return "text-yellow-400";
      case "debug": return "text-blue-400";
      default: return "text-white";
    }
  };

  // Get color for table cell value - MobaXterm-like
  const getValueColor = (value: string) => {
    if (value === "True") return "text-green-400";
    if (value === "False") return "text-red-400";
    if (value === "None") return "text-gray-500";
    if (value.includes("/")) return "text-yellow-400"; // For fractions like 10/10
    if (!isNaN(Number(value))) return "text-blue-400"; // For numbers
    return "text-white"; // Default
  };

  // Function for auto-detecting special rows in log
  const isTableHeader = (message: string): boolean => {
    return message.includes("TRACK_ID") || 
           message.includes("Status") || 
           message.includes("Name") ||
           (message.includes("--") && message.includes("--"));
  };

  // Function for checking if a line is part of a table
  const isTableRow = (message: string): boolean => {
    // If message has multiple continuous spaces or tabs, it's likely a table
    return message.match(/\s{2,}/) !== null || 
           message.match(/\t/) !== null || 
           message.includes("live") ||
           message.match(/^\d+\s+[A-Z0-9]+\s+\d{4}-\d{2}-\d{2}/) !== null;
  };

  const fetchLogData = async () => {
    setLoading(true);
    try {
      const logRequest: LogRequest = {
        machineId: machine.id,
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        liveMode: false,
        startDate: undefined,
        endDate: undefined,
        applicationName: "aixp_ee"
      };
      
      const logData = await sshService.fetchLogs(logRequest);
      setLogs(logData);
      
      if (autoScroll) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Eroare la obținerea log-urilor:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut obține log-urile. Verificați conexiunea SSH.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const showLiveLog = () => {
    setActiveView("logs");
    startLiveMode();
  };

  const startLiveMode = () => {
    setLiveMode(true);
    fetchLiveData();
    
    setAutoScroll(true);
    
    liveIntervalRef.current = window.setInterval(fetchLiveData, 3000);
  };

  const fetchLiveData = async () => {
    try {
      const logRequest: LogRequest = {
        machineId: machine.id,
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        liveMode: true,
        applicationName: "aixp_ee"
      };
      
      const liveLogs = await sshService.fetchLogs(logRequest);
      
      setLogs(prev => {
        if (!liveLogs || liveLogs.length === 0) return prev;
        
        const combined = [...prev, ...liveLogs];
        const uniqueLogs = Array.from(new Map(combined.map(log => 
          [`${log.timestamp}-${log.level}-${log.message}`, log]
        )).values());
        
        const result = uniqueLogs.slice(Math.max(0, uniqueLogs.length - 2000));
        
        if (autoScroll) {
          setTimeout(scrollToBottom, 100);
        }
        
        return result;
      });
    } catch (error) {
      console.error('Eroare la obținerea log-urilor live:', error);
      if (error.toString().includes('ECONNREFUSED') || error.toString().includes('Network Error')) {
        stopLiveMode();
        toast({
          title: "Modul live oprit",
          description: "Conexiunea SSH a fost întreruptă. Modul live a fost oprit.",
          variant: "destructive"
        });
      }
    }
  };

  const stopLiveMode = () => {
    setLiveMode(false);
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = undefined;
    }
  };

  const executeCommand = async () => {
    if (!terminalCommand.trim()) return;
    
    setIsExecuting(true);
    // Add command to terminal output
    setTerminalOutput(prev => 
      prev + `\n$ ${terminalCommand}\n`
    );
    
    // Add to history
    setTerminalHistory(prev => [...prev, terminalCommand]);
    setHistoryIndex(-1);
    
    try {
      const response = await sshService.executeCommand({
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        command: terminalCommand
      });
      
      // Update terminal output with command result
      setTerminalOutput(prev => 
        prev + `${response.output}\n`
      );
      
    } catch (error) {
      console.error('Eroare la executarea comenzii:', error);
      // Update terminal output with error
      setTerminalOutput(prev => 
        prev + `Eroare: ${error.message || 'Nu s-a putut executa comanda'}\n`
      );
      
      toast({
        title: "Eroare",
        description: "Nu s-a putut executa comanda. Verificați conexiunea SSH.",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
      setTerminalCommand("");
      setTimeout(() => {
        scrollTerminalToBottom();
      }, 100);
    }
  };

  const restartEEService = async () => {
    setActiveView("terminal");
    setIsExecuting(true);
    setTerminalOutput(prev => 
      prev + "\n$ sudo systemctl restart aixp_ee\n"
    );
    
    try {
      const response = await sshService.executeCommand({
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        command: "sudo systemctl restart aixp_ee"
      });
      
      setTerminalOutput(prev => 
        prev + `${response.output}\nServiciul aixp_ee a fost repornit cu succes.\n`
      );
      
      toast({
        title: "Serviciu repornit",
        description: "Serviciul aixp_ee a fost repornit cu succes."
      });
      
    } catch (error) {
      console.error('Eroare la repornirea serviciului:', error);
      setTerminalOutput(prev => 
        prev + `Eroare: ${error.message || 'Nu s-a putut reporni serviciul'}\n`
      );
      
      toast({
        title: "Eroare",
        description: "Nu s-a putut reporni serviciul. Verificați conexiunea SSH și permisiunile.",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        scrollTerminalToBottom();
      }, 100);
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Up Arrow for history
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (terminalHistory.length > 0 && historyIndex < terminalHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setTerminalCommand(terminalHistory[terminalHistory.length - 1 - newIndex]);
      }
    }
    // Handle Down Arrow for history
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setTerminalCommand(terminalHistory[terminalHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalCommand("");
      }
    }
    // Handle Enter key
    else if (e.key === "Enter" && !isExecuting) {
      e.preventDefault();
      executeCommand();
    }
  };

  const downloadLogs = () => {
    const formattedLogs = logs.map(log => 
      `[${formatDateTime(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([formattedLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${machine.hostname}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Descărcare completă",
      description: "Log-urile au fost descărcate cu succes."
    });
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  const scrollTerminalToBottom = () => {
    if (terminalOutputRef.current) {
      const container = terminalOutputRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (!logContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (isNearBottom !== autoScroll) {
      setAutoScroll(isNearBottom);
    }
  };

  useEffect(() => {
    stopLiveMode();
    fetchLogData();
    
    // Clear terminal output when changing machines
    setTerminalOutput("");
    setTerminalHistory([]);
    setHistoryIndex(-1);
    
    return () => {
      stopLiveMode();
    };
  }, [machine.id]);

  // Function to render log line in MobaXterm style
  const renderLogLine = (log: LogEntry, index: number) => {
    const message = log.message;
    const syslogIdentifier = log.syslogIdentifier || "system";
    
    // Check for special formatting cases
    if (log.originalLine && log.originalLine.startsWith('[EE]')) {
      // Format EE logs like in MobaXterm (errors in red)
      return (
        <div key={index} className="mb-1 font-mono text-red-500">
          {log.originalLine}
        </div>
      );
    } 
    else if (isTableHeader(message)) {
      // Format table headers differently
      return (
        <div key={index} className="mb-1 font-mono text-yellow-400 font-bold">
          {message}
        </div>
      );
    }
    else if (isTableRow(message)) {
      // Try to format tabular data
      try {
        // Split by multiple spaces or tabs
        const parts = message.split(/\s{2,}|\t/).filter(part => part.trim() !== '');
        
        if (parts.length > 1) {
          return (
            <div key={index} className="mb-1 font-mono flex flex-wrap">
              {parts.map((part, i) => (
                <span 
                  key={i} 
                  className={`${getValueColor(part)} mr-3`}
                  style={{ minWidth: '6ch' }}
                >
                  {part}
                </span>
              ))}
            </div>
          );
        }
      } catch (e) {
        console.error("Error parsing table row:", e);
      }
    }
    
    // Default format with MobaXterm coloring for regular logs
    return (
      <div key={index} className={`mb-1 font-mono ${getLevelColor(log.level)}`}>
        {log.timestamp ? (
          <>
            <span className="text-gray-400">
              [{formatDateTime(log.timestamp)}]
            </span>{' '}
          </>
        ) : null}
        <span className={`font-semibold ${getLevelColor(log.level)}`}>
          [{log.level.toUpperCase()}]
        </span>{' '}
        <span className={`${getColorForComponent(syslogIdentifier)}`}>
          [{syslogIdentifier}]
        </span>{' '}
        <span>{message}</span>
      </div>
    );
  };

  return (
    <Card className="border-0 rounded-none shadow-none">
      <CardHeader className="px-6">
        <CardTitle className="flex justify-between items-center">
          <span>Terminal pentru {machine.hostname} ({machine.ip})</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setActiveView("terminal")}
              className={activeView === "terminal" ? "bg-secondary" : ""}
            >
              <TerminalIcon className="h-4 w-4 mr-2" />
              Terminal
            </Button>
            <Button 
              variant="outline" 
              onClick={showLiveLog}
              className={activeView === "logs" && liveMode ? "bg-secondary" : ""}
            >
              <FileText className="h-4 w-4 mr-2" />
              Show log
            </Button>
            <Button 
              variant="outline" 
              onClick={restartEEService}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart EE
            </Button>
            {activeView === "logs" && (
              <Button 
                variant="outline" 
                onClick={downloadLogs} 
                disabled={logs.length === 0 || loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Descarcă log-uri
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {activeView === "logs" ? (
          <div className="relative">
            <div 
              ref={logContainerRef}
              onScroll={handleScroll}
              className="border-0 h-[70vh] overflow-auto bg-black text-white p-4 font-mono text-sm w-full"
            >
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <TerminalIcon className="h-12 w-12 mb-2" />
                  <p>Nu există log-uri disponibile</p>
                  <p className="text-xs mt-2">Apăsați butonul "Show log" pentru a afișa logurile în timp real</p>
                </div>
              ) : (
                <div>
                  {logs.map((log, index) => renderLogLine(log, index))}
                </div>
              )}
            </div>
            
            {!autoScroll && logs.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-4 right-4 bg-secondary text-primary z-10"
                onClick={() => {
                  setAutoScroll(true);
                  scrollToBottom();
                }}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="flex flex-col h-[70vh] bg-black text-white font-mono">
              <div 
                ref={terminalOutputRef}
                className="flex-1 p-4 overflow-auto"
              >
                <div className="text-green-400 mb-4">
                  Conectat la {machine.hostname} ({machine.ip}) ca {machine.sshUsername}
                  <br />
                  Introduceți comenzi de terminal:
                </div>
                {terminalOutput ? (
                  <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
                ) : (
                  <div className="text-gray-500 italic">
                    Introduceți o comandă și apăsați Enter pentru a o executa
                  </div>
                )}
              </div>
              <div className="border-t border-gray-700 p-2 flex items-center">
                <span className="text-green-400 mr-2">$</span>
                <Input
                  ref={terminalInputRef}
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  onKeyDown={handleTerminalKeyDown}
                  placeholder="Introduceți o comandă..."
                  disabled={isExecuting}
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white"
                  autoFocus
                />
                {isExecuting && (
                  <div className="animate-spin ml-2 h-4 w-4 border-2 border-gray-400 border-t-white rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogViewer;
