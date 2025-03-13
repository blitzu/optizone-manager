
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole, User } from "@/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Trash2, 
  UserPlus, 
  Key, 
  Copy, 
  RefreshCw, 
  CheckCircle 
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import EmailMessageDialog from "./EmailMessageDialog";

const UserManagement = () => {
  const { getAllUsers, createUser, deleteUser, resetUserPassword, changeUserPassword } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [error, setError] = useState("");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [generateRandomPassword, setGenerateRandomPassword] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [showEmailMessageDialog, setShowEmailMessageDialog] = useState(false);
  const [newUserData, setNewUserData] = useState<{username: string, password: string | null, requirePasswordChange: boolean}>({
    username: "",
    password: null,
    requirePasswordChange: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const loadedUsers = await getAllUsers();
      setUsers(loadedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Numele de utilizator trebuie să aibă cel puțin 3 caractere.");
      return;
    }

    let finalPassword = password;
    
    // Generate random password if option is selected
    if (generateRandomPassword) {
      finalPassword = generateRandomPasswordString();
    } else if (finalPassword.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }

    try {
      const success = await createUser(username, finalPassword, role, requirePasswordChange);
      
      if (success) {
        // Show email message dialog with user data
        setNewUserData({
          username: username,
          password: finalPassword,
          requirePasswordChange: requirePasswordChange
        });
        setShowEmailMessageDialog(true);
        
        // Reset form
        setUsername("");
        setPassword("");
        setRole("user");
        setGenerateRandomPassword(false);
        loadUsers();
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setError("Eroare la crearea utilizatorului.");
    }
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      try {
        const success = await deleteUser(userToDelete);
        if (success) {
          loadUsers();
        }
      } catch (error) {
        console.error("Error deleting user:", error);
      }
      setUserToDelete(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const tempPass = await resetUserPassword(user.id);
      if (tempPass) {
        setUserToManage(user);
        setTempPassword(tempPass);
        setShowPasswordDialog(true);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
    }
  };

  const handleChangePassword = async () => {
    if (!userToManage) return;
    
    try {
      let finalPassword = newPassword;
      
      if (generateRandomPassword) {
        finalPassword = generateRandomPasswordString();
      } else if (finalPassword.length < 6) {
        setError("Parola trebuie să aibă cel puțin 6 caractere.");
        return;
      }
      
      const success = await changeUserPassword(userToManage.id, finalPassword, requirePasswordChange);
      
      if (success) {
        // Show email message dialog with user data
        setNewUserData({
          username: userToManage.username,
          password: finalPassword,
          requirePasswordChange: requirePasswordChange
        });
        setShowEmailMessageDialog(true);
        
        setShowChangePasswordDialog(false);
        setNewPassword("");
        setGenerateRandomPassword(false);
        loadUsers();
      }
    } catch (error) {
      console.error("Error changing password:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  const generateRandomPasswordString = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Creare utilizator nou</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nume utilizator</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="generatePassword"
                checked={generateRandomPassword}
                onChange={(e) => setGenerateRandomPassword(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="generatePassword" className="cursor-pointer">
                Generează parolă aleatorie
              </Label>
            </div>
            
            {!generateRandomPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Parolă</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!generateRandomPassword}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select 
                value={role} 
                onValueChange={(value: UserRole) => setRole(value)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selectează rolul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="user">Utilizator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 my-2">
              <input
                type="checkbox"
                id="requirePasswordChange"
                checked={requirePasswordChange}
                onChange={(e) => setRequirePasswordChange(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="requirePasswordChange" className="cursor-pointer">
                Solicită schimbarea parolei la prima autentificare
              </Label>
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Crează utilizator
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utilizatori existenți</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Se încarcă...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">Nu există alți utilizatori.</p>
          ) : (
            <div className="space-y-4">
              {users.map((user: User) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between py-2 px-4 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.role === 'admin' ? 'Administrator' : 'Utilizator'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setUserToManage(user);
                        setShowChangePasswordDialog(true);
                      }}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleResetPassword(user)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setUserToDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Această acțiune va șterge utilizatorul {user.username} și nu poate fi anulată.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                            Anulează
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteUser}>
                            Șterge
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Temporary Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parolă temporară generată</DialogTitle>
            <DialogDescription>
              Pentru utilizatorul: {userToManage?.username || username}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
              <code className="font-mono">{tempPassword}</code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(tempPassword || "")}
              >
                {passwordCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Această parolă va fi afișată doar acum. Asigură-te că o copiezi sau notezi.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowPasswordDialog(false);
              setTempPassword(null);
              setUserToManage(null);
            }}>
              Am înțeles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change User Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimbă parola utilizatorului</DialogTitle>
            <DialogDescription>
              {userToManage?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="generateRandomPwd"
                checked={generateRandomPassword}
                onChange={(e) => setGenerateRandomPassword(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="generateRandomPwd" className="cursor-pointer">
                Generează parolă aleatorie
              </Label>
            </div>
            
            {!generateRandomPassword && (
              <div className="space-y-2">
                <Label htmlFor="newPassword">Parola nouă</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required={!generateRandomPassword}
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2 my-2">
              <input
                type="checkbox"
                id="requireChange"
                checked={requirePasswordChange}
                onChange={(e) => setRequirePasswordChange(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="requireChange" className="cursor-pointer">
                Solicită schimbarea parolei la prima autentificare
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)}>
              Anulează
            </Button>
            <Button onClick={handleChangePassword}>
              Schimbă parola
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email Message Dialog */}
      <EmailMessageDialog
        open={showEmailMessageDialog}
        onOpenChange={setShowEmailMessageDialog}
        username={newUserData.username}
        password={newUserData.password}
        requirePasswordChange={newUserData.requirePasswordChange}
      />
    </div>
  );
};

export default UserManagement;
