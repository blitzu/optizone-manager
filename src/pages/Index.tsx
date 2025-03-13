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

const API_URL = import.meta.env.VITE_API_URL || '/api';

const Index = () => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const token = localStorage.getItem('auth-token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const response = await fetch(`${API_URL}/machines`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch machines');
        }
        
        const data = await response.json();
        
        if (data.success && data.machines) {
          setMachines(data.machines);
        } else {
          console.error("Error fetching machines:", data.message);
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
      }
    };
    
    fetchMachines();
  }, []);

  const saveMachines = (updatedMachines: Machine[]) => {
    setMachines(updatedMachines);
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

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setActiveTab("logs");
  };

  const handleBackToList = () => {
    setSelectedMachine(null);
  };

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
            <TabsTrigger value="logs">Vizualizare Logs</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Gestiune Utilizatori</TabsTrigger>}
            <TabsTrigger value="settings">Setări cont</TabsTrigger>
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
              <LogViewer 
                machine={selectedMachine} 
                onBackToList={handleBackToList}
              />
            </div>
          ) : (
            <div className="p-8">
              <h3 className="text-lg font-medium mb-4 text-center">Selectați un PC pentru a vizualiza logurile</h3>
              {machines.length === 0 ? (
                <p className="text-center text-muted-foreground">Nu există mașini disponibile pentru vizualizare.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {machines.map(machine => (
                    <div 
                      key={machine.id}
                      className="border rounded-md p-4 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                      onClick={() => handleSelectMachine(machine)}
                    >
                      <p className="font-medium">{machine.hostname}</p>
                      <p className="text-sm text-muted-foreground">{machine.ip}</p>
                    </div>
                  ))}
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
