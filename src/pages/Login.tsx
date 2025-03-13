
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/utils/dateUtils";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username || !password) {
      toast({
        title: "Eroare",
        description: "Vă rugăm să completați ambele câmpuri",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login for user:", username);
      
      // Simplify login - let the server detect the IP
      const result = await login(username, password);
      
      console.log("Login result:", result);
      
      if (result.success) {
        toast({
          title: "Autentificare reușită",
          description: `Bine ai venit, ${result.user?.username || username}!`
        });
        
        // Show lastLogin info in toast if available
        if (result.user?.lastLogin) {
          console.log("LastLogin data:", result.user.lastLogin);
          // Format date with seconds using the formatDateTime utility
          const lastLoginDate = formatDateTime(result.user.lastLogin.date);
          toast({
            title: "Informații de autentificare",
            description: `Ultima autentificare: ${lastLoginDate}`,
          });
        } else {
          console.log("No lastLogin data available in user object");
          
          toast({
            title: "Informații de autentificare",
            description: "Aceasta este prima dvs. autentificare sau nu există informații anterioare."
          });
        }
        
        // Immediately navigate to home
        navigate("/");
      } else {
        // Error message is shown by the login function via toast
        console.error(result.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la autentificare",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold">
            Autentificare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
              <Input
                id="username"
                placeholder="Nume utilizator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="Parolă"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? "Se procesează..." : "Autentificare"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
