import { useState, useEffect, useRef } from "react";
import { Machine, LogEntry, LogRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  Download, 
  Terminal as TerminalIcon, 
  FileText,
  RefreshCw,
  ArrowDown,
  PauseCircle,
  PlayCircle,
  ArrowLeft
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/utils/dateUtils";
import { Input } from "@/components/ui/input";
import { sshService } from "@/services/sshService";

interface LogViewerProps {
  machine: Machine;
  onBackToList?: () => void;
}

const LogViewer = ({ machine, onBackToList }: LogViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
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

  const getTextColor = (text: string): string => {
    if (
      text.includes("ERROR") || text.includes("FAIL") || text.includes("FAILED") || 
      text.includes("FAILURE") || text.includes("CRITICAL") || text.includes("FATAL") || 
      text.includes("PANIC") || text.includes("NO") || text.includes("FALSE") || 
      text.includes("DISABLED") || text.includes("INACTIVE") || text.includes("OFFLINE") || 
      text.includes("DISCONNECTED") || text.includes("DOWN") || text.includes("DENIED") || 
      text.includes("UNAUTHORIZED") || text.includes("TIMEOUT") || text.includes("TIMEOUTS") || 
      text.includes("LATENCY") || text.includes("RESET") || text.includes("ABORTED") || 
      text.includes("INTERRUPTED") || text.includes("DELETE") || text.includes("DELETED") || 
      text.includes("REMOVED") || text.includes("BLOCKED") || text.includes("REJECTED") || 
      text.includes("REFUSED") || text.includes("LOW") || text.includes("STOPPED") || 
      text.includes("UNLOADED")
    ) {
      return "text-mobaxterm-red";
    }
    
    if (
      text.includes("WARNING") || text.includes("CAUTION") || text.includes("ALERT") || 
      text.includes("NOTICE") || text.includes("DEPRECATED") || text.includes("UNSTABLE") || 
      text.includes("OVERLOAD") || text.includes("LIMIT") || text.includes("HIGH")
    ) {
      return "text-mobaxterm-yellow";
    }
    
    if (
      text.includes("SUCCESS") || text.includes("PASSED") || text.includes("COMPLETED") || 
      text.includes("OK") || text.includes("DONE") || text.includes("READY") || 
      text.includes("INSTALLED") || text.includes("YES") || text.includes("TRUE") || 
      text.includes("ENABLED") || text.includes("ACTIVE") || text.includes("ONLINE") || 
      text.includes("CONNECTED") || text.includes("UP") || text.includes("AUTHORIZED") || 
      text.includes("AUTHENTICATED") || text.includes("CREATE") || text.includes("CREATED") || 
      text.includes("OPENED") || text.includes("LOADED") || text.includes("RUNNING") || 
      text.includes("NORMAL")
    ) {
      return "text-mobaxterm-green";
    }
    
    if (
      text.includes("INFO") || text.includes("STATUS") || text.includes("DETAIL") || 
      text.includes("REQUEST") || text.includes("RESPONSE") || text.includes("QUERY") || 
      text.includes("SENT") || text.includes("RECEIVED") || text.includes("[INFO]")
    ) {
      return "text-mobaxterm-blue";
    }
    
    if (
      text.includes("DEBUG") || text.includes("TRACE") || text.includes("VERBOSE") || 
      text.includes("IP") || text.includes("IPv4") || text.includes("IPv6") || 
      text.includes("ADDRESS") || text.includes("HOST") || text.includes("URL") || 
      text.includes("DOMAIN") || text.includes("DNS") || text.includes("PORT") || 
      text.includes("HTTP") || text.includes("HTTPS") || text.includes("SSH") || 
      text.includes("FTP") || text.includes("[DEBUG]")
    ) {
      return "text-mobaxterm-magenta";
    }
    
    if (
      text.includes("LOGIN") || text.includes("LOGOUT") || text.includes("PASSWORD") || 
      text.includes("USERNAME") || text.includes("USER") || text.includes("DATE") || 
      text.includes("TIME") || text.includes("TIMESTAMP") || text.includes("START") || 
      text.includes("END") || text.includes("DURATION") || text.includes("MEMORY") || 
      text.includes("CPU") || text.includes("DISK") || text.includes("NETWORK")
    ) {
      return "text-mobaxterm-brightCyan";
    }
    
    if (
      text.includes("EXECUTE") || text.includes("RUN") || text.includes("CMD") || 
      text.includes("COMMAND") || text.includes("READ") || text.includes("WRITE") || 
      text.includes("SAVED") || text.includes("UPDATED") || text.includes("COUNT") || 
      text.includes("TOTAL") || text.includes("SIZE") || text.includes("AMOUNT") || 
      text.includes("PERCENT") || text.includes("PERCENTAGE") || text.includes("GB") || 
      text.includes("MB") || text.includes("KB") || text.includes("BYTES") || 
      text.includes("AVAILABLE") || text.includes("USED") || text.includes("FREE")
    ) {
      return "text-mobaxterm-brightWhite";
    }
    
    if (
      text.includes("PROCESSING") || text.includes("WAITING") || text.includes("IDLE")
    ) {
      return "text-mobaxterm-brightYellow";
    }
    
    if (text.includes("[EE]")) return "text-mobaxterm-red";
    if (text.includes("[WARNING]")) return "text-mobaxterm-yellow";
    if (text.includes("[DEBUG]")) return "text-mobaxterm-magenta";
    if (text.includes("[INFO]")) return "text-mobaxterm-blue";
    
    return "text-mobaxterm-white";
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
          [`${log.timestamp}-${log.message}`, log]
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

  const toggleLiveMode = () => {
    if (liveMode) {
      stopLiveMode();
    } else {
      startLiveMode();
    }
  };

  const executeCommand = async () => {
    if (!terminalCommand.trim()) return;
    
    setIsExecuting(true);
    setTerminalOutput(prev => 
      prev + `\n$ ${terminalCommand}\n`
    );
    
    setTerminalHistory(prev => [...prev, terminalCommand]);
    setHistoryIndex(-1);
    
    try {
      const response = await sshService.executeCommand({
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        command: terminalCommand
      });
      
      setTerminalOutput(prev => 
        prev + `${response.output}\n`
      );
      
    } catch (error) {
      console.error('Eroare la executarea comenzii:', error);
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
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (terminalHistory.length > 0 && historyIndex < terminalHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setTerminalCommand(terminalHistory[terminalHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setTerminalCommand(terminalHistory[terminalHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalCommand("");
      }
    } else if (e.key === "Enter" && !isExecuting) {
      e.preventDefault();
      executeCommand();
    }
  };

  const downloadLogs = async () => {
    try {
      setLoading(true);
      
      const logRequest: LogRequest = {
        machineId: machine.id,
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        liveMode: false,
        applicationName: "aixp_ee"
      };
      
      const rawLogs = await sshService.downloadRawLogs(logRequest);
      
      const blob = new Blob([rawLogs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${machine.hostname}-${new Date().toISOString().split('T')[0]}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Descărcare completă",
        description: "Log-urile au fost descărcate cu succes în format brut."
      });
    } catch (error) {
      console.error('Eroare la descărcarea log-urilor:', error);
      toast({
        title: "Eroare",
        description: "Nu s-au putut descărca log-urile. Verificați conexiunea SSH.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  const toggleAutoScroll = () => {
    setAutoScroll(prev => !prev);
    if (!autoScroll) {
      scrollToBottom();
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
    setLogs([]);
    startLiveMode();
    
    setTerminalOutput("");
    setTerminalHistory([]);
    setHistoryIndex(-1);
    
    return () => {
      stopLiveMode();
    };
  }, [machine.id]);

  const renderRawLogLine = (log: LogEntry, index: number) => {
    const logText = log.originalLine || log.message;
    const textColor = getTextColor(logText);
    
    return (
      <div 
        key={index} 
        className={`mb-1 font-mono ${textColor}`}
        style={{ 
          whiteSpace: 'pre', 
          fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.4'
        }}
      >
        {logText}
      </div>
    );
  };

  return (
    <Card className="border-0 rounded-none shadow-none">
      <CardHeader className="px-6">
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {onBackToList && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onBackToList}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Înapoi la lista de mașini
              </Button>
            )}
            <span>Terminal pentru {machine.hostname} ({machine.ip})</span>
          </div>
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
              onClick={() => {
                setActiveView("logs");
                if (!liveMode) startLiveMode();
              }}
              className={activeView === "logs" && liveMode ? "bg-secondary" : ""}
            >
              <FileText className="h-4 w-4 mr-2" />
              Show log
            </Button>
            <Button 
              variant="outline" 
              onClick={toggleLiveMode}
              className={liveMode ? "bg-secondary" : ""}
            >
              {liveMode ? (
                <PauseCircle className="h-4 w-4 mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              {liveMode ? "Oprește live" : "Pornește live"}
            </Button>
            <Button 
              variant="outline" 
              onClick={toggleAutoScroll}
              className={autoScroll ? "bg-secondary" : ""}
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              {autoScroll ? "Oprește autoscroll" : "Pornește autoscroll"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveView("terminal");
                restartEEService();
              }}
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
              className="border-0 h-[70vh] overflow-auto bg-mobaxterm-background text-mobaxterm-foreground p-4 font-mono text-sm w-full"
              style={{ 
                fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                fontSize: '14px',
                tabSize: 4
              }}
            >
              {loading && logs.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mobaxterm-foreground"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-mobaxterm-brightBlack">
                  <TerminalIcon className="h-12 w-12 mb-2" />
                  <p>Nu există log-uri disponibile</p>
                  <p className="text-xs mt-2">Se așteaptă log-uri de la server...</p>
                </div>
              ) : (
                <div className="font-mono whitespace-pre">
                  {logs.map((log, index) => renderRawLogLine(log, index))}
                  {loading && (
                    <div className="flex justify-center my-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-mobaxterm-foreground"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex flex-col h-[70vh] bg-mobaxterm-background text-mobaxterm-foreground font-mono">
              <div 
                ref={terminalOutputRef}
                className="flex-1 p-4 overflow-auto"
                style={{ 
                  fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                  fontSize: '14px',
                  whiteSpace: 'pre',
                  tabSize: 4
                }}
              >
                <div className="text-mobaxterm-green mb-4">
                  Conectat la {machine.hostname} ({machine.ip}) ca {machine.sshUsername}
                  <br />
                  Introduceți comenzi de terminal:
                </div>
                {terminalOutput ? (
                  <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
                ) : (
                  <div className="text-mobaxterm-brightBlack italic">
                    Introduceți o comandă și apăsați Enter pentru a o executa
                  </div>
                )}
              </div>
              <div className="border-t border-mobaxterm-brightBlack p-2 flex items-center">
                <span className="text-mobaxterm-green mr-2">$</span>
                <Input
                  ref={terminalInputRef}
                  value={terminalCommand}
                  onChange={(e) => setTerminalCommand(e.target.value)}
                  onKeyDown={handleTerminalKeyDown}
                  placeholder="Introduceți o comandă..."
                  disabled={isExecuting}
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-mobaxterm-white"
                  autoFocus
                />
                {isExecuting && (
                  <div className="animate-spin ml-2 h-4 w-4 border-2 border-mobaxterm-brightBlack border-t-mobaxterm-white rounded-full"></div>
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

