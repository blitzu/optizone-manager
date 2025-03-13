
import { useState, useEffect } from "react";
import { Machine, MachineResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Edit, Trash2, Server, Terminal } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { appConfig } from "@/config/appConfig";
import { sshService } from "@/services/sshService";
import { useAuth } from "@/contexts/AuthContext";

interface MachineManagerProps {
  machines: Machine[];
  saveMachines: (machines: Machine[]) => void;
  selectedMachine: Machine | null;
  setSelectedMachine: (machine: Machine | null) => void;
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
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/machines`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }
      
      const data: MachineResponse = await response.json();
      
      if (data.success && data.machines) {
        saveMachines(data.machines);
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Nu s-au putut încărca mașinile.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching machines:", error);
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
      let response;
      
      if (isEditing) {
        // Update machine
        response = await fetch(`${API_URL}/machines/${currentMachine.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify(currentMachine)
        });
      } else {
        // Add new machine
        response = await fetch(`${API_URL}/machines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify(currentMachine)
        });
      }
      
      if (!response.ok) {
        throw new Error('Failed to save machine');
      }
      
      const data: MachineResponse = await response.json();
      
      if (data.success) {
        if (isEditing) {
          // Update existing machine in the list
          const updatedMachines = machines.map(m => 
            m.id === currentMachine.id ? { ...data.machine as Machine } : m
          );
          saveMachines(updatedMachines);
          
          if (selectedMachine?.id === currentMachine.id) {
            setSelectedMachine(data.machine as Machine);
          }
          
          toast({
            title: "Mașină actualizată",
            description: `Mașina ${currentMachine.hostname} a fost actualizată cu succes.`
          });
        } else {
          // Add new machine to the list
          if (data.machine) {
            saveMachines([...machines, data.machine]);
            toast({
              title: "Mașină adăugată",
              description: `Mașina ${data.machine.hostname} a fost adăugată cu succes.`
            });
          }
        }
        
        // Reset form and close dialog
        setDialogOpen(false);
        resetForm();
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Nu s-a putut salva mașina.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving machine:", error);
      toast({
        title: "Eroare de conexiune",
        description: "Nu s-a putut conecta la server pentru a salva mașina.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/machines/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete machine');
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
    } catch (error) {
      console.error("Error deleting machine:", error);
      toast({
        title: "Eroare de conexiune",
        description: "Nu s-a putut conecta la server pentru a șterge mașina.",
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
        title: "Conectare SSH",
        description: `Se conectează la ${machine.hostname} (${machine.ip})...`,
      });
      
      const result = await sshService.testConnection(machine);
      
      if (result.success) {
        toast({
          title: "Conectare reușită",
          description: `Conexiune SSH stabilită cu ${machine.hostname}`,
        });
      } else {
        toast({
          title: "Conectare eșuată",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut stabili conexiunea SSH. Verificați configurarea serverului.",
        variant: "destructive"
      });
    }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Mașini ({machines.length})</span>
          <Button onClick={openAddDialog}>Adaugă mașină</Button>
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
                <TableHead>Hostname</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map(machine => (
                <TableRow 
                  key={machine.id} 
                  className={`cursor-pointer ${selectedMachine?.id === machine.id ? 'bg-muted' : ''}`}
                  onClick={() => handleSelectMachine(machine)}
                >
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
