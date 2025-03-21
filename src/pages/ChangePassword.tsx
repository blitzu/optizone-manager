
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const ChangePassword = () => {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const { changeTempPassword, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Parse the tempToken and username from the URL query parameters
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get("tempToken");
    const user = searchParams.get("username");
    
    if (token) {
      setTempToken(token);
    } else {
      toast({
        title: "Eroare",
        description: "Token lipsă. Vă rugăm să vă autentificați din nou.",
        variant: "destructive",
      });
      navigate("/login");
    }
    
    if (user) {
      setUsername(user);
    }
  }, [location.search, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username) {
      toast({
        title: "Eroare",
        description: "Vă rugăm să introduceți numele de utilizator",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Eroare",
        description: "Parola trebuie să aibă cel puțin 6 caractere",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Eroare",
        description: "Parolele nu coincid",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const success = await changeTempPassword(username, tempToken, newPassword);
      
      if (success) {
        toast({
          title: "Succes",
          description: "Parola a fost schimbată cu succes. Vă rugăm să vă autentificați din nou cu noua parolă.",
        });
        
        // Ensure we log out and redirect to login with a short delay to show the success message
        setTimeout(() => {
          // First completely clear localStorage
          localStorage.clear(); // Clear ALL localStorage items, not just token and user
          
          // Remove specific authentication items
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          // Call the logout function to clean up auth context state
          logout();
          
          // Force navigation to login page with replace to prevent back navigation
          navigate("/login", { replace: true });
        }, 1500);
      } else {
        toast({
          title: "Eroare",
          description: "Nu s-a putut schimba parola. Vă rugăm să încercați din nou.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "Eroare",
        description: "A apărut o eroare la schimbarea parolei",
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
            Schimbare parolă
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
              <Input
                id="username"
                placeholder="Nume utilizator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!!username} 
                className={!!username ? "bg-gray-100" : ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Parolă nouă</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Parolă nouă"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirmă parola"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="change-password-button"
            >
              {loading ? "Se procesează..." : "Schimbă parola"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;
