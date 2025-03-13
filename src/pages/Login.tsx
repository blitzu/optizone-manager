
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // State for password change dialog
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [tempToken, setTempToken] = useState("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      const loginResult = await login(username, password);
      
      setIsSubmitting(false);
      if (loginResult.success) {
        if (loginResult.requirePasswordChange) {
          // Show password change dialog if user needs to change password
          setTempToken(loginResult.tempToken || "");
          setShowChangePasswordDialog(true);
        } else {
          navigate("/");
        }
      } else {
        setLoginError(loginResult.message || "Nume de utilizator sau parolă incorecte.");
      }
    } catch (error) {
      setIsSubmitting(false);
      setLoginError("Eroare la conectarea cu serverul. Încercați din nou mai târziu.");
      console.error("Login error:", error);
    }
  };
  
  const handlePasswordChange = () => {
    if (newPassword.length < 6) {
      setPasswordError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Parolele nu coincid.");
      return;
    }
    
    setPasswordError("");
    
    // Call API to change password
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/change-temp-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        username, 
        tempToken, 
        newPassword 
      }),
    })
    .then(response => response.json())
    .then(async data => {
      if (data.success) {
        setShowChangePasswordDialog(false);
        // Re-login with new password
        try {
          const loginResult = await login(username, newPassword);
          if (loginResult.success) {
            navigate("/");
          } else {
            setLoginError(loginResult.message || "Autentificare eșuată după schimbarea parolei.");
          }
        } catch (error) {
          console.error("Error logging in after password change:", error);
          setLoginError("Eroare la reconectare după schimbarea parolei.");
        }
      } else {
        setPasswordError(data.message || "Eroare la schimbarea parolei.");
      }
    })
    .catch(error => {
      console.error("Error changing password:", error);
      setPasswordError("Eroare la conexiunea cu serverul.");
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Optizone Fleet Manager</CardTitle>
          <CardDescription className="text-center">
            Introduceți datele de autentificare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginError && (
              <Alert variant="destructive" className="py-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  {loginError}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
              <Input
                id="username"
                type="text"
                placeholder="Introduceți utilizatorul"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="Introduceți parola"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Se procesează..." : "Autentificare"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          {/* No demo user information */}
        </CardFooter>
      </Card>
      
      {/* Password Change Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimbare parolă obligatorie</DialogTitle>
            <DialogDescription>
              Trebuie să schimbați parola temporară pentru a continua.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {passwordError && (
              <Alert variant="destructive" className="py-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Parolă nouă</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handlePasswordChange}>Schimbă parola</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
