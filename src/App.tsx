
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ChangePassword from "./pages/ChangePassword";
import { toast } from "sonner";

console.log("Componenta App se inițializează...");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'A apărut o eroare de conexiune. Verificați conexiunea la server.';
        
        toast.error(errorMessage);
        console.error('Query error:', error);
      }
    },
    mutations: {
      onError: (error) => {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'A apărut o eroare de conexiune. Verificați conexiunea la server.';
        
        if (errorMessage.includes('permisiuni') || errorMessage.includes('permission denied')) {
          toast.error('Eroare de permisiuni pe server. Contactați administratorul sistemului.');
        } else {
          toast.error(errorMessage);
        }
        
        console.error('Mutation error:', error);
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
            <Sonner />
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
