
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import MachineManager from "@/components/MachineManager";
import LogViewer from "@/components/LogViewer";
import UserSettings from "@/components/UserSettings";
import UserManagement from "@/components/UserManagement";
import { Machine } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { sshService } from "@/services/sshService";
import { toast } from "@/components/ui/use-toast";
import { appConfig } from "@/config/appConfig";

const Index = () => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem("optizone-machines");
    const parsedMachines = saved ? JSON.parse(saved) : [];
    
    // Asigură-te că toate mașinile au credențialele SSH implicite setate
    return parsedMachines.map((machine: Machine) => ({
      ...machine,
      sshUsername: machine.sshUsername || appConfig.defaultSshUsername,
      sshPassword: machine.sshPassword || appConfig.defaultSshPassword
    }));
  });

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Actualizăm mașinile existente la prima încărcare pentru a avea credențialele SSH implicite
  useEffect(() => {
    if (machines.length > 0) {
      const updatedMachines = machines.map(machine => ({
        ...machine,
        sshUsername: machine.sshUsername || appConfig.defaultSshUsername,
        sshPassword: machine.sshPassword || appConfig.defaultSshPassword
      }));
      
      saveMachines(updatedMachines);
    }
  }, []);

  const saveMachines = (updatedMachines: Machine[]) => {
    setMachines(updatedMachines);
    localStorage.setItem("optizone-machines", JSON.stringify(updatedMachines));
  };

  const testSshConnection = async (machine: Machine) => {
    try {
      toast({
        title: "Se testează conexiunea SSH...",
        description: `Se încearcă conectarea la ${machine.hostname} (${machine.ip})`,
      });

      const result = await sshService.testConnection(machine);
      
      if (result.success) {
        toast({
          title: "Conexiune reușită",
          description: result.message,
        });
      } else {
        toast({
          title: "Conexiune eșuată",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Nu s-a putut testa conexiunea SSH. Verificați configurarea serverului.",
        variant: "destructive"
      });
    }
  };

  // Verificăm dacă suntem în modul de vizualizare log-uri pentru a afișa conținutul pe toată lățimea
  const [activeTab, setActiveTab] = useState<string>(isAdmin ? "machines" : "logs");

  return (
    <div className={`${activeTab === 'logs' && selectedMachine ? 'container-fluid px-0 mx-0 max-w-none' : 'container mx-auto'} py-6`}>
      <div className={`${activeTab === 'logs' && selectedMachine ? 'px-6' : ''} flex justify-between items-center mb-6`}>
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
      
      <Tabs 
        defaultValue={isAdmin ? "machines" : "logs"} 
        className="w-full"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <div className={`${activeTab === 'logs' && selectedMachine ? 'px-6' : ''}`}>
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
        </div>
        
        {isAdmin && (
          <TabsContent value="machines" className="px-6">
            <MachineManager 
              machines={machines} 
              saveMachines={saveMachines}
              selectedMachine={selectedMachine}
              setSelectedMachine={setSelectedMachine}
            />
          </TabsContent>
        )}
        
        <TabsContent value="logs" className={selectedMachine ? 'px-0' : 'px-6'}>
          {selectedMachine ? (
            <div className="space-y-4">
              <div className="flex justify-end px-6">
                <Button 
                  variant="outline"
                  onClick={() => testSshConnection(selectedMachine)}
                >
                  Testează conexiunea SSH
                </Button>
              </div>
              <LogViewer machine={selectedMachine} />
            </div>
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
          <TabsContent value="users" className="px-6">
            <UserManagement />
          </TabsContent>
        )}
        
        <TabsContent value="settings" className="px-6">
          <UserSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
