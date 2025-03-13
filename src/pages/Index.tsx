
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import MachineManager from "@/components/MachineManager";
import LogViewer from "@/components/LogViewer";
import UserSettings from "@/components/UserSettings";
import UserManagement from "@/components/UserManagement";
import { Machine } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem("optizone-machines");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const saveMachines = (updatedMachines: Machine[]) => {
    setMachines(updatedMachines);
    localStorage.setItem("optizone-machines", JSON.stringify(updatedMachines));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Optizone Fleet Manager</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            Conectat ca: <span className="font-medium">{currentUser?.username}</span> 
            ({currentUser?.role === 'admin' ? 'Administrator' : 'Utilizator'})
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Deconectare
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={isAdmin ? "machines" : "logs"} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {isAdmin && <TabsTrigger value="machines">Gestiune PC-uri</TabsTrigger>}
          <TabsTrigger 
            value="logs" 
            disabled={!selectedMachine && !isAdmin}
          >
            Vizualizare Logs
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Gestiune Utilizatori</TabsTrigger>}
          <TabsTrigger value="settings">
            Setări cont
          </TabsTrigger>
        </TabsList>
        
        {isAdmin && (
          <TabsContent value="machines">
            <MachineManager 
              machines={machines} 
              saveMachines={saveMachines}
              selectedMachine={selectedMachine}
              setSelectedMachine={setSelectedMachine}
            />
          </TabsContent>
        )}
        
        <TabsContent value="logs">
          {selectedMachine ? (
            <LogViewer machine={selectedMachine} />
          ) : (
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium mb-2">Selectați un PC pentru a vizualiza logurile</h3>
              {isAdmin ? (
                <p>Puteți alege un PC din tab-ul "Gestiune PC-uri"</p>
              ) : (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">PC-uri disponibile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machines.map(machine => (
                      <div 
                        key={machine.id}
                        className="border rounded-md p-4 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedMachine(machine)}
                      >
                        <p className="font-medium">{machine.hostname}</p>
                        <p className="text-sm text-muted-foreground">{machine.ip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="settings">
          <UserSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
