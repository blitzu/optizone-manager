
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

console.log("Componenta App se inițializează...");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

console.log("QueryClient inițializat");

const App = () => {
  console.log("Randare App...");
  
  return (
    <QueryClientProvider client={queryClient}>
      {console.log("Randare QueryClientProvider")}
      <AuthProvider>
        {console.log("Randare AuthProvider")}
        <TooltipProvider>
          {console.log("Randare TooltipProvider")}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {console.log("Randare BrowserRouter")}
            <Routes>
              {console.log("Randare Routes")}
              <Route path="/login" element={<Login />} />
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
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
