
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const UserSettings = () => {
  const { currentUser, changePassword, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (newPassword.length < 6) {
      setError("Parola nouă trebuie să aibă cel puțin 6 caractere.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Parolele nu coincid.");
      setLoading(false);
      return;
    }

    if (!currentUser) {
      setError("Utilizator neautentificat.");
      setLoading(false);
      return;
    }

    try {
      const success = await changePassword(currentUser.id, oldPassword, newPassword);
      
      if (success) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({
          title: "Succes",
          description: "Parola a fost schimbată cu succes. Vă rugăm să vă autentificați din nou.",
        });
        
        // Log the user out after successful password change with a small delay
        // to allow them to see the success message
        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setError("A apărut o eroare la schimbarea parolei.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-4">
        <p>Vă rugăm să vă autentificați pentru a accesa setările contului.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schimbare parolă</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Parola curentă</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Parola nouă</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Se procesează..." : "Schimbă parola"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettings;
