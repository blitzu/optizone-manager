import { useState, useEffect, useRef } from "react";
import { Machine, MachineResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Edit, Trash2, Server, Terminal, RefreshCw, Wifi, WifiOff, Server as ServerIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/config/appConfig";
import { sshService } from "@/services/sshService";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MachineManagerProps {
  machines: Machine[];
  saveMachines: (machines: Machine[]) => void;
  selectedMachine: Machine | null;
  setSelectedMachine: (machine: Machine | null) => void;
}

interface MachineWithStatus extends Machine {
  isOnline?: boolean;      // Răspunde la ping
  isSSHConnected?: boolean; // Conexiune SSH activă
  lastChecked?: Date;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

const MachineManager = ({ 
  machines, 
  saveMachines,
  selectedMachine,
  setSelectedMachine
}: MachineManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMachine, setCurrentMachine] = useState<Partial<Machine>>({
    ip: "",
    hostname: "",
    sshUsername: appConfig.defaultSshUsername,
    sshPassword: appConfig.defaultSshPassword
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [machinesWithStatus, setMachinesWithStatus] = useState<MachineWithStatus[]>([]);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const statusCheckIntervalRef = useRef<number | null>(null);
  const { currentUser } = useAuth();
  const activeSSHConnectionsRef = useRef<{[key: string]: boolean}>({});

  useEffect(() => {
    if (currentUser && currentUser.id) {
      console.log("MachineManager: utilizator autentificat, se încarcă mașinile");
      fetchMachines();
    } else {
      console.log("MachineManager: nu există utilizator autentificat sau id lipsește");
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [currentUser]);

  useEffect(() => {
    setMachinesWithStatus(prevMachinesWithStatus => {
      return machines.map(machine => {
        const existingMachine = prevMachinesWithStatus.find(m => m.id === machine.id);
        return {
          ...machine,
          isOnline: existingMachine?.isOnline,
          isSSHConnected: existingMachine?.isSSHConnected,
          lastChecked: existingMachine?.lastChecked
        };
      });
    });
  }, [machines]);

  useEffect(() => {
    if (machinesWithStatus.length > 0 && !statusCheckIntervalRef.current) {
      checkMachinesStatus();
      
      statusCheckIntervalRef.current = window.setInterval(() => {
        checkMachinesStatus();
      }, 30000);
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    };
  }, [machinesWithStatus]);

  const checkMachinesStatus = async () => {
    if (checkingStatus || machinesWithStatus.length === 0) return;
    
    setCheckingStatus(true);
    
    try {
      console.log("Verificare status pentru mașini...");
      const updatedMachines = [...machinesWithStatus];
      
      for (let i = 0; i < updatedMachines.length; i++) {
        const machine = updatedMachines[i];
        const machineId = machine.id;
        
        if (activeSSHConnectionsRef.current[machineId]) {
          try {
            console.log(`Verificare conexiune SSH activă pentru ${machine.hostname}`);
            const sshResult = await sshService.testConnection(machine);
            
            if (sshResult.success) {
              updatedMachines[i] = {
                ...updatedMachines[i],
                isOnline: true,
                isSSHConnected: true,
                lastChecked: new Date()
              };
              console.log(`Conexiune SSH activă menținută cu ${machine.hostname}`);
            } else {
              activeSSHConnectionsRef.current[machineId] = false;
              const pingResult = await sshService.pingMachine(machine);
              
              updatedMachines[i] = {
                ...updatedMachines[i],
                isOnline: pingResult,
                isSSHConnected: false,
                lastChecked: new Date()
              };
              console.log(`Conexiune SSH pierdută cu ${machine.hostname}, ping: ${pingResult ? 'reușit' : 'eșuat'}`);
            }
          } catch (error) {
            console.error(`Eroare la verificarea conexiunii SSH active cu ${machine.hostname}:`, error);
            activeSSHConnectionsRef.current[machineId] = false;
            
            const pingResult = await sshService.pingMachine(machine);
            
            updatedMachines[i] = {
              ...updatedMachines[i],
              isOnline: pingResult,
              isSSHConnected: false,
              lastChecked: new Date()
            };
          }
        } else {
          try {
            console.log(`Verificare ping pentru ${machine.hostname}`);
            const pingResult = await sshService.pingMachine(machine);
            
            if (pingResult) {
              console.log(`Ping reușit pentru ${machine.hostname}, se încearcă conectarea SSH`);
              const sshResult = await sshService.testConnection(machine);
              
              if (sshResult.success) {
                activeSSHConnectionsRef.current[machineId] = true;
                updatedMachines[i] = {
                  ...updatedMachines[i],
                  isOnline: true,
                  isSSHConnected: true,
                  lastChecked: new Date()
                };
                console.log(`Conexiune SSH stabilită cu ${machine.hostname}`);
              } else {
                activeSSHConnectionsRef.current[machineId] = false;
                updatedMachines[i] = {
                  ...updatedMachines[i],
                  isOnline: true,
                  isSSHConnected: false,
                  lastChecked: new Date()
                };
                console.log(`Ping reușit, dar SSH eșuat pentru ${machine.hostname}: ${sshResult.message}`);
              }
            } else {
              activeSSHConnectionsRef.current[machineId] = false;
              updatedMachines[i] = {
                ...updatedMachines[i],
                isOnline: false,
                isSSHConnected: false,
                lastChecked: new Date()
              };
              console.log(`Ping eșuat pentru ${machine.hostname}, mașină offline`);
            }
          } catch (error) {
            console.error(`Eroare la verificarea mașinii ${machine.hostname}:`, error);
            activeSSHConnectionsRef.current[machineId] = false;
            updatedMachines[i] = {
              ...updatedMachines[i],
              isOnline: false,
              isSSHConnected: false,
              lastChecked: new Date()
            };
          }
        }
      }
      
      setMachinesWithStatus(updatedMachines);
    } catch (error) {
      console.error("Eroare la verificarea status-ului mașinilor:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      let token = localStorage.getItem('auth-token');
      
      if (!token) {
        token = localStorage.getItem('token');
      }
      
      if (!token) {
        console.error("MachineManager: Nu s-a găsit niciun token de autentificare");
        throw new Error('No authentication token found');
      }
      
      console.log("MachineManager: Se face cerere pentru mașini cu token");
      
      const response = await fetch(`${API_URL}/machines`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("MachineManager: Răspuns de eroare de la server:", errorData);
        throw new Error(errorData.message || 'Failed to fetch machines');
      }
      
      const data: MachineResponse = await response.json();
      console.log("MachineManager: Date primite de la server:", data);
      
      if (data.success && data.machines) {
        console.log("MachineManager: Mașini încărcate cu succes:", data.machines.length);
        saveMachines(data.machines);
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Nu s-au putut încărca mașinile.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("MachineManager: Error fetching machines:", error);
      toast({
        title: "Eroare de conexiune",
        description: "Nu s-a putut conecta la server pentru a încărca mașinile.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentMachine({
      ip: "",
      hostname: "",
      sshUsername: appConfig.defaultSshUsername,
      sshPassword: appConfig.defaultSshPassword
    });
    setIsEditing(false);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (machine: Machine) => {
    setCurrentMachine({ 
      ...machine,
      sshUsername: machine.sshUsername || appConfig.defaultSshUsername,
      sshPassword: machine.sshPassword || appConfig.defaultSshPassword
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentMachine.ip || !currentMachine.hostname) {
      toast({
        title: "Câmpuri obligatorii",
        description: "Te rugăm să completezi toate câmpurile necesare.",
        variant: "destructive"
      });
      return;
    }

    try {
      let token = localStorage.getItem('auth-token');
      
      if (!token) {
        toast({
          title: "Eroare de autentificare",
          description: "Nu sunteți autentificat. Vă rugăm să vă autentificați din nou.",
          variant: "destructive"
        });
        return;
      }
      
      let response;
      
      if (isEditing) {
        response = await fetch(`${API_URL}/machines/${currentMachine.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(currentMachine)
        });
      } else {
        response = await fetch(`${API_URL}/machines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(currentMachine)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save machine');
      }
      
      const data: MachineResponse = await response.json();
      
      if (data.success) {
        if (isEditing && data.machine) {
          const updatedMachines = machines.map(m => 
            m.id === currentMachine.id ? { ...data.machine } : m
          );
          saveMachines(updatedMachines);
          
          if (selectedMachine?.id === currentMachine.id) {
            setSelectedMachine(data.machine);
          }
          
          toast({
            title: "Mașină actualizată",
            description: `Mașina ${currentMachine.hostname} a fost actualizată cu succes.`
          });
        } else if (data.machine) {
          saveMachines([...machines, data.machine]);
          toast({
            title: "Mașină adăugată",
            description: `Mașina ${data.machine.hostname} a fost adăugată cu succes.`
          });
        }
        
        setDialogOpen(false);
        resetForm();
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Nu s-a putut salva mașina.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error saving machine:", error);
      toast({
        title: "Eroare de conexiune",
        description: error.message || "Nu s-a putut conecta la server pentru a salva mașina.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      let token = localStorage.getItem('auth-token');
      
      if (!token) {
        toast({
          title: "Eroare de autentificare",
          description: "Nu sunteți autentificat. Vă rugăm să vă autentificați din nou.",
          variant: "destructive"
        });
        return;
      }
      
      const response = await fetch(`${API_URL}/machines/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete machine');
      }
      
      const data: MachineResponse = await response.json();
      
      if (data.success) {
        if (selectedMachine?.id === id) {
          setSelectedMachine(null);
        }
        
        const updatedMachines = machines.filter(m => m.id !== id);
        saveMachines(updatedMachines);
        
        toast({
          title: "Mașină ștearsă",
          description: "Mașina a fost ștearsă cu succes."
        });
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Nu s-a putut șterge mașina.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error deleting machine:", error);
      toast({
        title: "Eroare de conexiune",
        description: error.message || "Nu s-a putut conecta la server pentru a șterge mașina.",
        variant: "destructive"
      });
    }
  };

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(selectedMachine?.id === machine.id ? null : machine);
  };

  const connectSSH = async (machine: Machine) => {
    try {
      toast({
        title: "Verificare status",
        description: `Se verifică status-ul pentru ${machine.hostname} (${machine.ip})...`,
      });
      
      const pingResult = await sshService.pingMachine(machine);
      
      if (!pingResult) {
        toast({
          title: "Mașină offline",
          description: `Mașina ${machine.hostname} nu răspunde la ping.`,
          variant: "destructive"
        });
        
        setMachinesWithStatus(prev => 
          prev.map(m => 
            m.id === machine.id 
              ? { ...m, isOnline: false, isSSHConnected: false, lastChecked: new Date() } 
              : m
          )
        );
        
        return;
      }
      
      toast({
        title: "Mașină online",
        description: `Mașina ${machine.hostname} răspunde la ping. Se încearcă conectarea SSH...`,
      });
      
      const sshResult = await sshService.testConnection(machine);
      
      if (sshResult.success) {
        activeSSHConnectionsRef.current[machine.id] = true;
        
        setMachinesWithStatus(prev => 
          prev.map(m => 
            m.id === machine.id 
              ? { ...m, isOnline: true, isSSHConnected: true, lastChecked: new Date() } 
              : m
          )
        );
        
        toast({
          title: "Conectare reușită",
          description: `Conexiune SSH stabilită cu ${machine.hostname}`,
        });
      } else {
        activeSSHConnectionsRef.current[machine.id] = false;
        
        setMachinesWithStatus(prev => 
          prev.map(m => 
            m.id === machine.id 
              ? { ...m, isOnline: true, isSSHConnected: false, lastChecked: new Date() } 
              : m
          )
        );
        
        toast({
          title: "Conectare SSH eșuată",
          description: sshResult.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      activeSSHConnectionsRef.current[machine.id] = false;
      
      setMachinesWithStatus(prev => 
        prev.map(m => 
          m.id === machine.id 
            ? { ...m, isOnline: false, isSSHConnected: false, lastChecked: new Date() } 
            : m
        )
      );
      
      toast({
        title: "Eroare",
        description: "Nu s-a putut stabili conexiunea. Verificați configurarea serverului.",
        variant: "destructive"
      });
    }
  };

  const getSortedMachines = () => {
    return [...machinesWithStatus].sort((a, b) => {
      if (a.isOnline === false && b.isOnline !== false) return -1;
      if (a.isOnline !== false && b.isOnline === false) return 1;
      
      if (a.isOnline === true && b.isOnline === true) {
        if (a.isSSHConnected !== b.isSSHConnected) {
          return a.isSSHConnected ? 1 : -1;
        }
      }
      
      return a.hostname.localeCompare(b.hostname);
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mașini</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="text-center">
            <Server className="mx-auto h-12 w-12 opacity-30 mb-2 animate-pulse" />
            <p>Se încarcă mașinile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedMachines = getSortedMachines();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Mașini ({machines.length})</span>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkMachinesStatus}
              disabled={checkingStatus}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
              {checkingStatus ? "Verificare..." : "Verifică status"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchMachines}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isLoading ? "Se încarcă..." : "Reîmprospătează"}
            </Button>
            <Button onClick={openAddDialog}>Adaugă mașină</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {machines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="mx-auto h-12 w-12 opacity-30 mb-2" />
            <p>Nu există mașini adăugate. Adaugă una pentru a începe.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMachines.map(machine => (
                <TableRow 
                  key={machine.id} 
                  className={`cursor-pointer ${selectedMachine?.id === machine.id ? 'bg-muted' : ''}`}
                  onClick={() => handleSelectMachine(machine)}
                >
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2">
                          {machine.isOnline === undefined ? (
                            <div className="flex items-center">
                              <div className="h-3 w-3 rounded-full bg-gray-300 mr-2"></div>
                              <span className="text-xs text-muted-foreground">Necunoscut</span>
                            </div>
                          ) : machine.isOnline ? (
                            <>
                              {machine.isSSHConnected ? (
                                <div className="flex items-center">
                                  <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                                  <Terminal className="h-4 w-4 text-green-500" />
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                                  <Wifi className="h-4 w-4 text-yellow-500" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center">
                              <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                              <WifiOff className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {machine.isOnline === undefined ? (
                          <span>Status necunoscut</span>
                        ) : machine.isOnline ? (
                          machine.isSSHConnected ? (
                            <span>Online - Conexiune SSH activă</span>
                          ) : (
                            <span>Online - Răspunde la ping, dar fără conexiune SSH</span>
                          )
                        ) : (
                          <span>Offline - Nu răspunde la ping</span>
                        )}
                        {machine.lastChecked && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Ultima verificare: {machine.lastChecked.toLocaleTimeString()}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-medium">{machine.hostname}</TableCell>
                  <TableCell>{machine.ip}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        connectSSH(machine);
                      }}
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(machine);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(machine.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 text-sm text-muted-foreground">
        Selectează o mașină pentru a vizualiza log-urile
      </CardFooter>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editează mașina" : "Adaugă mașină nouă"}
            </DialogTitle>
            <DialogDescription>
              Completează informațiile necesare pentru a {isEditing ? "actualiza" : "adăuga"} o mașină.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Hostname</label>
              <Input 
                value={currentMachine.hostname} 
                onChange={e => setCurrentMachine({...currentMachine, hostname: e.target.value})}
                placeholder="ex: server-ubuntu-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Adresă IP</label>
              <Input 
                value={currentMachine.ip} 
                onChange={e => setCurrentMachine({...currentMachine, ip: e.target.value})}
                placeholder="ex: 192.168.1.100"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Utilizator SSH</label>
              <Input 
                value={currentMachine.sshUsername} 
                onChange={e => setCurrentMachine({...currentMachine, sshUsername: e.target.value})}
                placeholder="Utilizator SSH"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Parolă SSH</label>
              <Input 
                type="password"
                value={currentMachine.sshPassword} 
                onChange={e => setCurrentMachine({...currentMachine, sshPassword: e.target.value})}
                placeholder="Parolă SSH"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulează</Button>
            <Button onClick={handleSubmit}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MachineManager;
