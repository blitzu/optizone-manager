
import { useState } from "react";
import { Machine } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Server } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface MachineManagerProps {
  machines: Machine[];
  saveMachines: (machines: Machine[]) => void;
  selectedMachine: Machine | null;
  setSelectedMachine: (machine: Machine | null) => void;
}

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
    os: "ubuntu_22.04"
  });
  const [isEditing, setIsEditing] = useState(false);

  const resetForm = () => {
    setCurrentMachine({
      ip: "",
      hostname: "",
      os: "ubuntu_22.04"
    });
    setIsEditing(false);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (machine: Machine) => {
    setCurrentMachine({ ...machine });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!currentMachine.ip || !currentMachine.hostname) {
      toast({
        title: "Câmpuri obligatorii",
        description: "Te rugăm să completezi toate câmpurile necesare.",
        variant: "destructive"
      });
      return;
    }

    if (isEditing) {
      // Editare mașină existentă
      const updatedMachines = machines.map(m => 
        m.id === currentMachine.id ? { ...currentMachine as Machine } : m
      );
      saveMachines(updatedMachines);
      
      // Update selected machine if it was the one being edited
      if (selectedMachine?.id === currentMachine.id) {
        setSelectedMachine(currentMachine as Machine);
      }
      
      toast({
        title: "Mașină actualizată",
        description: `Mașina ${currentMachine.hostname} a fost actualizată cu succes.`
      });
    } else {
      // Adăugare mașină nouă
      const newMachine: Machine = {
        ...currentMachine as Omit<Machine, 'id'>,
        id: Date.now().toString()
      };
      
      saveMachines([...machines, newMachine]);
      toast({
        title: "Mașină adăugată",
        description: `Mașina ${newMachine.hostname} a fost adăugată cu succes.`
      });
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (selectedMachine?.id === id) {
      setSelectedMachine(null);
    }
    
    const updatedMachines = machines.filter(m => m.id !== id);
    saveMachines(updatedMachines);
    
    toast({
      title: "Mașină ștearsă",
      description: "Mașina a fost ștearsă cu succes."
    });
  };

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(selectedMachine?.id === machine.id ? null : machine);
  };

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
                <TableHead>Sistem de operare</TableHead>
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
                  <TableCell>
                    {machine.os === "ubuntu_20.04" ? "Ubuntu 20.04" : "Ubuntu 22.04"}
                  </TableCell>
                  <TableCell className="text-right">
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
              <label className="text-sm font-medium mb-1 block">Sistem de operare</label>
              <Select 
                value={currentMachine.os} 
                onValueChange={value => setCurrentMachine({...currentMachine, os: value as Machine['os']})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectează OS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ubuntu_20.04">Ubuntu 20.04</SelectItem>
                  <SelectItem value="ubuntu_22.04">Ubuntu 22.04</SelectItem>
                </SelectContent>
              </Select>
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
