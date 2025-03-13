
import { useState, useEffect, useRef } from "react";
import { Machine, LogEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Download, Terminal } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// Date picker component from shadcn
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Funcție pentru simularea obținerii de log-uri (în aplicația reală, aceasta ar face un apel la un backend)
const fetchLogs = (machine: Machine, startDate?: Date, endDate?: Date): Promise<LogEntry[]> => {
  // Simulăm un răspuns de la server
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generăm log-uri aleatorii pentru simulare
      const levels: LogEntry['level'][] = ['info', 'warning', 'error', 'debug'];
      const logs: LogEntry[] = [];
      
      const totalLogs = Math.floor(Math.random() * 50) + 20;
      
      for (let i = 0; i < totalLogs; i++) {
        const date = startDate && endDate 
          ? new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
          : new Date(Date.now() - Math.random() * 86400000);
          
        logs.push({
          timestamp: date.toISOString(),
          level: levels[Math.floor(Math.random() * levels.length)],
          message: `Process: aixp_ee [${Math.floor(Math.random() * 10000)}]: ${
            Math.random() > 0.5 
              ? "Starting background task" 
              : Math.random() > 0.5 
                ? "Connection established" 
                : "Service operation completed"
          } (host=${machine.hostname})`
        });
      }
      
      // Sortăm log-urile după timestamp
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      resolve(logs);
    }, 500);
  });
};

interface LogViewerProps {
  machine: Machine;
}

const LogViewer = ({ machine }: LogViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const liveIntervalRef = useRef<number>();

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case "info": return "text-blue-500";
      case "warning": return "text-amber-500";
      case "error": return "text-red-500";
      case "debug": return "text-purple-500";
      default: return "";
    }
  };

  const fetchLogData = async () => {
    setLoading(true);
    try {
      const logData = await fetchLogs(machine, startDate, endDate);
      setLogs(logData);
    } catch (error) {
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
    fetchLogData();
    
    // Simulăm actualizarea log-urilor la fiecare 3 secunde în mod live
    liveIntervalRef.current = window.setInterval(() => {
      fetchLogs(machine).then(newLogs => {
        setLogs(prev => {
          const combined = [...prev, ...newLogs.slice(0, 5)];
          // Păstrăm doar ultimele 1000 de log-uri pentru a nu supraîncărca memoria
          return combined.slice(Math.max(0, combined.length - 1000));
        });
      });
    }, 3000);
  };

  const stopLiveMode = () => {
    setLiveMode(false);
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
    }
  };

  const downloadLogs = () => {
    const formattedLogs = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
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

  useEffect(() => {
    // Oprim modul live și obținem log-uri noi atunci când se schimbă mașina selectată
    stopLiveMode();
    fetchLogData();
    
    return () => {
      stopLiveMode();
    };
  }, [machine.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Log-uri pentru {machine.hostname} ({machine.ip})</span>
          <div className="flex gap-2">
            <Button 
              variant={liveMode ? "destructive" : "default"} 
              onClick={liveMode ? stopLiveMode : startLiveMode}
              disabled={loading}
            >
              {liveMode ? "Oprește Live" : "Pornește Live"}
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadLogs} 
              disabled={logs.length === 0 || loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Descarcă log-uri
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="view" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">Vizualizare</TabsTrigger>
            <TabsTrigger value="filter">Filtrare după dată</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view">
            <div className="border rounded-md h-[50vh] overflow-auto bg-black text-white p-4 font-mono text-sm">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Terminal className="h-12 w-12 mb-2" />
                  <p>Nu există log-uri disponibile</p>
                  <p className="text-xs mt-2">Începeți modul live sau filtrați după dată pentru a vedea log-uri</p>
                </div>
              ) : (
                <div>
                  {logs.map((log, index) => (
                    <div key={index} className={`mb-1 ${getLevelColor(log.level)}`}>
                      <span className="text-gray-400">
                        [{new Date(log.timestamp).toLocaleString()}]
                      </span>{' '}
                      <span className="font-semibold">[{log.level.toUpperCase()}]</span>{' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="filter">
            <div className="grid gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">De la data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left"
                        >
                          {startDate ? format(startDate, "PPP") : "Alege data de început"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Până la data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left"
                        >
                          {endDate ? format(endDate, "PPP") : "Alege data de sfârșit"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {startDate && endDate && startDate > endDate && (
                  <div className="flex items-center rounded-md bg-amber-100 text-amber-800 px-4 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Data de început nu poate fi mai mare decât data de sfârșit
                  </div>
                )}
                
                <Button 
                  onClick={fetchLogData} 
                  disabled={loading || !startDate || !endDate || startDate > endDate}
                  className="w-full"
                >
                  {loading ? 
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-background border-t-transparent rounded-full"></div>
                      Se încarcă...
                    </div> : 
                    "Filtrează log-uri"
                  }
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LogViewer;
