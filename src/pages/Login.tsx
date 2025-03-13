
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

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
      const result = await login(username, password);
      
      console.log("Login result:", result);
      console.log("User data with lastLogin info:", result.user);
      
      if (result.success) {
        toast({
          title: "Autentificare reușită",
          description: `Bine ai venit, ${result.user?.username || username}!`
        });
        
        // Show lastLogin info in toast if available
        if (result.user?.lastLogin) {
          console.log("LastLogin data:", result.user.lastLogin);
          const lastLoginDate = new Date(result.user.lastLogin.date).toLocaleString('ro-RO');
          toast({
            title: "Informații de autentificare",
            description: `Ultima autentificare: ${lastLoginDate}`,
          });
        } else {
          console.log("No lastLogin data available in user object");
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

  const handleForgotPassword = async () => {
    if (!username) {
      toast({
        title: "Introduceți numele de utilizator",
        description: "Pentru a reseta parola, introduceți numele de utilizator",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Email trimis",
          description:
            "Un email cu instrucțiuni pentru resetarea parolei a fost trimis",
        });
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Utilizatorul nu a fost găsit",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la procesarea cererii",
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Parolă</Label>
              </div>
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
