
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ChangePassword from "./pages/ChangePassword";
import { toast } from "@/hooks/use-toast";

console.log("Componenta App se inițializează...");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      meta: {
        onError: (error: unknown) => {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'A apărut o eroare de conexiune. Verificați conexiunea la server.';
          
          toast({
            title: "Eroare",
            description: errorMessage,
            variant: "destructive"
          });
          console.error('Query error:', error);
        }
      }
    },
    mutations: {
      meta: {
        onError: (error: unknown) => {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'A apărut o eroare de conexiune. Verificați conexiunea la server.';
          
          if (errorMessage.includes('permisiuni') || errorMessage.includes('permission denied')) {
            toast({
              title: "Eroare",
              description: 'Eroare de permisiuni pe server. Contactați administratorul sistemului.',
              variant: "destructive"
            });
          } else {
            toast({
              title: "Eroare",
              description: errorMessage,
              variant: "destructive"
            });
          }
          
          console.error('Mutation error:', error);
        }
      }
    }
  },
});

console.log("QueryClient inițializat");

const App = () => {
  console.log("Randare App...");
  
  console.log("Randare QueryClientProvider");
  console.log("Randare BrowserRouter");
  console.log("Randare AuthProvider");
  console.log("Randare TooltipProvider");
  console.log("Randare Routes");
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
