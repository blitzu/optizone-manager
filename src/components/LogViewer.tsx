
import { useState, useEffect, useRef } from "react";
import { Machine, LogEntry, LogRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Download, Terminal, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/utils/dateUtils";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sshService } from "@/services/sshService";

interface LogViewerProps {
  machine: Machine;
}

const LogViewer = ({ machine }: LogViewerProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [startDateTime, setStartDateTime] = useState<Date>();
  const [endDateTime, setEndDateTime] = useState<Date>();
  const [applicationName, setApplicationName] = useState<string>("aixp_ee");
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
      const logRequest: LogRequest = {
        machineId: machine.id,
        ip: machine.ip,
        sshUsername: machine.sshUsername,
        sshPassword: machine.sshPassword,
        liveMode: false,
        startDate: startDateTime?.toISOString(),
        endDate: endDateTime?.toISOString(),
        applicationName: applicationName || "aixp_ee"
      };
      
      const logData = await sshService.fetchLogs(logRequest);
      setLogs(logData);
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
    
    // Actualizăm log-urile la fiecare 3 secunde în mod live
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
        applicationName: applicationName || "aixp_ee"
      };
      
      const liveLogs = await sshService.fetchLogs(logRequest);
      
      setLogs(prev => {
        // Dacă nu avem log-uri noi, nu actualizăm starea
        if (!liveLogs || liveLogs.length === 0) return prev;
        
        const combined = [...prev, ...liveLogs];
        // Eliminăm duplicatele și păstrăm doar ultimele 2000 de log-uri (conform comenzii)
        const uniqueLogs = Array.from(new Map(combined.map(log => 
          [`${log.timestamp}-${log.level}-${log.message}`, log]
        )).values());
        return uniqueLogs.slice(Math.max(0, uniqueLogs.length - 2000));
      });
    } catch (error) {
      console.error('Eroare la obținerea log-urilor live:', error);
      // Nu afișăm toast pentru a nu deranja utilizatorul la fiecare eroare în modul live
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
            <TabsTrigger value="filter">Filtrare</TabsTrigger>
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
                      {log.syslogIdentifier && <span className="text-purple-400">[{log.syslogIdentifier}]</span>}{' '}
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
                <div>
                  <label className="text-sm font-medium mb-1 block">Numele aplicației/serviciului</label>
                  <Input
                    placeholder="Introduceți numele aplicației (ex: aixp_ee)"
                    value={applicationName}
                    onChange={(e) => setApplicationName(e.target.value)}
                    className="mb-4"
                  />
                  <div className="flex flex-col space-y-1 text-xs text-muted-foreground">
                    <p>Introduceți numele serviciului systemd (ex: aixp_ee)</p>
                    <p>Valoarea implicită este "aixp_ee"</p>
                  </div>
                </div>
                
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
                  disabled={loading || (startDateTime && endDateTime && startDateTime > endDateTime)}
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
