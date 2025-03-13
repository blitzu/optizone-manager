
import { useState, useEffect, useRef } from "react";
import { Machine, LogEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Download, Terminal, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatDateTime, formatDateForAPI } from "@/utils/dateUtils";
import { Input } from "@/components/ui/input";

// Date picker component from shadcn
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [startDateTime, setStartDateTime] = useState<Date>();
  const [endDateTime, setEndDateTime] = useState<Date>();
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
      const logData = await fetchLogs(machine, startDateTime, endDateTime);
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

  useEffect(() => {
    // Oprim modul live și obținem log-uri noi atunci când se schimbă mașina selectată
    stopLiveMode();
    fetchLogData();
    
    return () => {
      stopLiveMode();
    };
  }, [machine.id]);

  // Format personalizat pentru data și ora
  const formatDateTimeDisplay = (date: Date | undefined) => {
    if (!date) return "";
    return format(date, "dd.MM.yyyy HH:mm");
  };

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
            <TabsTrigger value="filter">Filtrare după dată și oră</TabsTrigger>
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
                        [{formatDateTime(log.timestamp)}]
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
                    <label className="text-sm font-medium mb-1 block">De la data și ora</label>
                    <div className="relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left"
                          >
                            {startDateTime ? (
                              formatDateTimeDisplay(startDateTime)
                            ) : (
                              "Alege data și ora de început"
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3">
                            <div className="space-y-3">
                              <Calendar
                                mode="single"
                                selected={startDateTime}
                                onSelect={(date) => {
                                  if (date) {
                                    // Păstrăm ora dacă există deja, altfel setăm la 00:00
                                    const newDate = new Date(date);
                                    if (startDateTime) {
                                      newDate.setHours(
                                        startDateTime.getHours(),
                                        startDateTime.getMinutes(),
                                        0, 0
                                      );
                                    } else {
                                      newDate.setHours(0, 0, 0, 0);
                                    }
                                    setStartDateTime(newDate);
                                  }
                                }}
                                initialFocus
                                className="pointer-events-auto"
                              />
                              
                              <div className="px-1 pb-2">
                                <label className="text-xs font-medium block mb-1">Ora:</label>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={23}
                                    placeholder="Ore"
                                    className="w-16 text-center"
                                    value={startDateTime ? startDateTime.getHours() : ""}
                                    onChange={(e) => {
                                      const hours = parseInt(e.target.value);
                                      if (!isNaN(hours) && hours >= 0 && hours <= 23) {
                                        const newDate = new Date(startDateTime || new Date());
                                        newDate.setHours(hours);
                                        setStartDateTime(newDate);
                                      }
                                    }}
                                  />
                                  <span>:</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={59}
                                    placeholder="Minute"
                                    className="w-16 text-center"
                                    value={startDateTime ? startDateTime.getMinutes() : ""}
                                    onChange={(e) => {
                                      const minutes = parseInt(e.target.value);
                                      if (!isNaN(minutes) && minutes >= 0 && minutes <= 59) {
                                        const newDate = new Date(startDateTime || new Date());
                                        newDate.setMinutes(minutes);
                                        setStartDateTime(newDate);
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Până la data și ora</label>
                    <div className="relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left"
                          >
                            {endDateTime ? (
                              formatDateTimeDisplay(endDateTime)
                            ) : (
                              "Alege data și ora de sfârșit"
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3">
                            <div className="space-y-3">
                              <Calendar
                                mode="single"
                                selected={endDateTime}
                                onSelect={(date) => {
                                  if (date) {
                                    // Păstrăm ora dacă există deja, altfel setăm la 23:59
                                    const newDate = new Date(date);
                                    if (endDateTime) {
                                      newDate.setHours(
                                        endDateTime.getHours(),
                                        endDateTime.getMinutes(),
                                        0, 0
                                      );
                                    } else {
                                      newDate.setHours(23, 59, 0, 0);
                                    }
                                    setEndDateTime(newDate);
                                  }
                                }}
                                initialFocus
                                className="pointer-events-auto"
                              />
                              
                              <div className="px-1 pb-2">
                                <label className="text-xs font-medium block mb-1">Ora:</label>
                                <div className="flex items-center space-x-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={23}
                                    placeholder="Ore"
                                    className="w-16 text-center"
                                    value={endDateTime ? endDateTime.getHours() : ""}
                                    onChange={(e) => {
                                      const hours = parseInt(e.target.value);
                                      if (!isNaN(hours) && hours >= 0 && hours <= 23) {
                                        const newDate = new Date(endDateTime || new Date());
                                        newDate.setHours(hours);
                                        setEndDateTime(newDate);
                                      }
                                    }}
                                  />
                                  <span>:</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={59}
                                    placeholder="Minute"
                                    className="w-16 text-center"
                                    value={endDateTime ? endDateTime.getMinutes() : ""}
                                    onChange={(e) => {
                                      const minutes = parseInt(e.target.value);
                                      if (!isNaN(minutes) && minutes >= 0 && minutes <= 59) {
                                        const newDate = new Date(endDateTime || new Date());
                                        newDate.setMinutes(minutes);
                                        setEndDateTime(newDate);
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                
                {startDateTime && endDateTime && startDateTime > endDateTime && (
                  <div className="flex items-center rounded-md bg-amber-100 text-amber-800 px-4 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Intervalul de timp selectat nu este valid
                  </div>
                )}
                
                <Button 
                  onClick={fetchLogData} 
                  disabled={loading || !startDateTime || !endDateTime || 
                    (startDateTime > endDateTime)}
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
