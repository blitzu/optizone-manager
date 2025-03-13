
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MachineManager from "@/components/MachineManager";
import LogViewer from "@/components/LogViewer";
import { Machine } from "@/types";

const Index = () => {
  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem("ubuntu-machines");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const saveMachines = (updatedMachines: Machine[]) => {
    setMachines(updatedMachines);
    localStorage.setItem("ubuntu-machines", JSON.stringify(updatedMachines));
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Ubuntu Fleet Manager</h1>
      
      <Tabs defaultValue="machines" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="machines">Gestiune PC-uri</TabsTrigger>
          <TabsTrigger value="logs" disabled={!selectedMachine}>
            Vizualizare Logs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines">
          <MachineManager 
            machines={machines} 
            saveMachines={saveMachines}
            selectedMachine={selectedMachine}
            setSelectedMachine={setSelectedMachine}
          />
        </TabsContent>
        
        <TabsContent value="logs">
          {selectedMachine && (
            <LogViewer machine={selectedMachine} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
