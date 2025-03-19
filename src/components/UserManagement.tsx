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
  RefreshCw, 
  UserCog,
  Shield,
  Clock,
  Globe,
  Info,
  UserMinus,
  UserCheck,
  Users,
  UserCircle
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
import { toast } from "@/hooks/use-toast";
import EmailMessageDialog from "./EmailMessageDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

const UserManagement = () => {
  const { getAllUsers, createUser, deactivateUser, reactivateUser, resetUserPassword, changeUserPassword, updateUserRole } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [error, setError] = useState("");
  const [userToDeactivate, setUserToDeactivate] = useState<string | null>(null);
  const [userToReactivate, setUserToReactivate] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [userToManage, setUserToManage] = useState<User | null>(null);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [generateRandomPassword, setGenerateRandomPassword] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [showEmailMessageDialog, setShowEmailMessageDialog] = useState(false);
  const [activeUsersOpen, setActiveUsersOpen] = useState(true);
  const [adminUsersOpen, setAdminUsersOpen] = useState(true);
  const [regularUsersOpen, setRegularUsersOpen] = useState(true);
  const [inactiveUsersOpen, setInactiveUsersOpen] = useState(true);
  const [newUserData, setNewUserData] = useState<{
    username: string;
    password: string | null;
    requirePasswordChange: boolean;
    role: UserRole;
  }>({
    username: "",
    password: null,
    requirePasswordChange: true,
    role: "user"
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const loadedUsers = await getAllUsers();
      console.log("Loaded users with login info:", loadedUsers);
      setUsers(loadedUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const groupedUsers = {
    active: {
      admin: users
        .filter(user => user.active !== false && user.role === "admin")
        .sort((a, b) => a.username.localeCompare(b.username)),
      user: users
        .filter(user => user.active !== false && user.role === "user")
        .sort((a, b) => a.username.localeCompare(b.username))
    },
    inactive: users
      .filter(user => user.active === false)
      .sort((a, b) => a.username.localeCompare(b.username))
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Numele de utilizator trebuie să aibă cel puțin 3 caractere.");
      return;
    }

    let finalPassword = password;
    
    if (generateRandomPassword) {
      finalPassword = generateRandomPasswordString();
    } else if (finalPassword.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }

    try {
      const success = await createUser(username, finalPassword, role, requirePasswordChange);
      
      if (success) {
        setNewUserData({
          username: username,
          password: finalPassword,
          requirePasswordChange: requirePasswordChange,
          role: role
        });
        setShowEmailMessageDialog(true);
        
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

  const handleDeactivateUser = async () => {
    if (userToDeactivate) {
      if (userToDeactivate === "1") {
        toast({
          title: "Operațiune interzisă",
          description: "REALIZATORUL APLICAȚIEI nu poate fi dezactivat.",
          variant: "destructive",
        });
        setUserToDeactivate(null);
        return;
      }
      
      try {
        const success = await deactivateUser(userToDeactivate);
        if (success) {
          loadUsers();
        }
      } catch (error) {
        console.error("Error deactivating user:", error);
      }
      setUserToDeactivate(null);
    }
  };

  const handleReactivateUser = async () => {
    if (userToReactivate) {
      try {
        const success = await reactivateUser(userToReactivate);
        if (success) {
          loadUsers();
        }
      } catch (error) {
        console.error("Error reactivating user:", error);
      }
      setUserToReactivate(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    if (isSuperUser(user.id)) {
      toast({
        title: "Operațiune interzisă",
        description: "Nu se poate reseta parola pentru REALIZATORUL APLICATIEI.",
        variant: "destructive",
      });
      return;
    }
    
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
    
    if (isSuperUser(userToManage.id)) {
      toast({
        title: "Operațiune interzisă",
        description: "Nu se poate schimba parola pentru REALIZATORUL APLICAȚIEI.",
        variant: "destructive",
      });
      setShowChangePasswordDialog(false);
      return;
    }
    
    try {
      let finalPassword = newPassword;
      
      if (generateRandomPassword) {
        finalPassword = generateRandomPasswordString();
      } else if (finalPassword.length < 6) {
        setError("Parola trebuie să aibă cel puțin 6 caractere.");
        return;
      }
      
      console.log("Changing password for user:", userToManage.id);
      console.log("New password:", finalPassword);
      console.log("Require password change:", requirePasswordChange);
      
      const success = await changeUserPassword(userToManage.id, finalPassword, requirePasswordChange);
      
      if (success) {
        setNewUserData({
          username: userToManage.username,
          password: finalPassword,
          requirePasswordChange: requirePasswordChange,
          role: userToManage.role
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

  const handleChangeRole = async () => {
    if (!userToManage) return;
    
    if (isSuperUser(userToManage.id)) {
      toast({
        title: "Operațiune interzisă",
        description: "Rolul REALIZATORULUI APLICAȚIEI nu poate fi modificat.",
        variant: "destructive",
      });
      setShowChangeRoleDialog(false);
      return;
    }
    
    try {
      if (userToManage.role !== newRole) {
        console.log(`Changing role for user ${userToManage.id} from ${userToManage.role} to ${newRole}`);
        const success = await updateUserRole(userToManage.id, newRole);
        
        if (success) {
          toast({
            title: "Succes",
            description: `Rolul utilizatorului ${userToManage.username} a fost schimbat în ${newRole === 'admin' ? 'Administrator' : 'Utilizator standard'}`,
          });
          
          loadUsers();
        }
      } else {
        toast({
          title: "Informare",
          description: "Nu s-a făcut nicio modificare, rolul este același.",
        });
      }
      
      setShowChangeRoleDialog(false);
    } catch (error) {
      console.error("Error changing user role:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut schimba rolul utilizatorului",
        variant: "destructive",
      });
    }
  };

  const generateRandomPasswordString = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const formatLastLogin = (date: string | undefined) => {
    if (!date) return "Niciodată";
    try {
      return new Date(date).toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", error, "Date value:", date);
      return "Format invalid";
    }
  };

  const isSuperUser = (userId: string) => userId === "1";
  
  const renderUserItem = (user: User) => (
    <div 
      key={user.id} 
      className="flex items-center justify-between py-2 px-4 border rounded-md mb-2 last:mb-0"
    >
      <div className="flex items-center space-x-2">
        {isSuperUser(user.id) && (
          <Shield className="h-4 w-4 text-amber-500" />
        )}
        <div>
          <div className="flex items-center space-x-2">
            <p className="font-medium">{user.username}</p>
            {user.active === false && (
              <Badge variant="outline" className="text-xs bg-gray-200">Dezactivat</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {user.role === 'admin' ? 'Administrator' : 'Utilizator'}
            {isSuperUser(user.id) && ' (REALIZATORUL APLICAȚIEI)'}
          </p>
          
          {user.lastLogin ? (
            <div className="flex items-center mt-1 text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>Ultimul login: {formatLastLogin(user.lastLogin.date)}</span>
            </div>
          ) : (
            <div className="flex items-center mt-1 text-xs text-gray-500">
              <Info className="h-3 w-3 mr-1" />
              <span>Fără informații de login</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setUserToManage(user);
            setShowChangePasswordDialog(true);
          }}
          disabled={isSuperUser(user.id) || user.active === false}
        >
          <Key className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleResetPassword(user)}
          disabled={isSuperUser(user.id) || user.active === false}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isSuperUser(user.id) || user.active === false}
          onClick={() => {
            setUserToManage(user);
            setNewRole(user.role);
            setShowChangeRoleDialog(true);
          }}
        >
          <UserCog className="h-4 w-4" />
        </Button>
        
        {user.active === false ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setUserToReactivate(user.id)}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reactivare utilizator</AlertDialogTitle>
                <AlertDialogDescription>
                  Ești sigur că dorești să reactivezi utilizatorul {user.username}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToReactivate(null)}>
                  Anulează
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleReactivateUser}>
                  Reactivează
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                disabled={isSuperUser(user.id)}
                onClick={() => setUserToDeactivate(user.id)}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ești sigur?</AlertDialogTitle>
                <AlertDialogDescription>
                  Această acțiune va dezactiva utilizatorul {user.username}. Acesta nu va mai putea accesa aplicația până când nu va fi reactivat.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setUserToDeactivate(null)}>
                  Anulează
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivateUser}>
                  Dezactivează
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );

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
            <Button 
              type="submit" 
              className="w-full"
              tooltip="Creează un cont nou de utilizator"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crează utilizator
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Utilizatori existenți</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadUsers}
            tooltip="Reîncarcă lista de utilizatori din baza de date"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reîmprospătează
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Se încarcă...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">Nu există alți utilizatori.</p>
          ) : (
            <div className="space-y-6">
              <Collapsible 
                open={activeUsersOpen} 
                onOpenChange={setActiveUsersOpen}
                className="border rounded-md p-2"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-medium">Utilizatori activi</h3>
                    <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                      {groupedUsers.active.admin.length + groupedUsers.active.user.length}
                    </Badge>
                  </div>
                  <div className="text-gray-500">
                    {activeUsersOpen ? "▼" : "▶"}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 px-2">
                  <Collapsible 
                    open={adminUsersOpen} 
                    onOpenChange={setAdminUsersOpen}
                    className="mb-4"
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-muted/50 rounded-md">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium">Administratori</h4>
                      <Badge variant="outline" className="ml-2">
                        {groupedUsers.active.admin.length}
                      </Badge>
                      <span className="ml-auto text-gray-500">
                        {adminUsersOpen ? "▼" : "▶"}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2 mt-2 space-y-2">
                      {groupedUsers.active.admin.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-2 text-center">Nu există administratori</p>
                      ) : (
                        groupedUsers.active.admin.map(user => renderUserItem(user))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <Separator className="my-4" />
                  
                  <Collapsible 
                    open={regularUsersOpen} 
                    onOpenChange={setRegularUsersOpen}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-muted/50 rounded-md">
                      <UserCircle className="h-4 w-4 text-indigo-600" />
                      <h4 className="font-medium">Utilizatori standard</h4>
                      <Badge variant="outline" className="ml-2">
                        {groupedUsers.active.user.length}
                      </Badge>
                      <span className="ml-auto text-gray-500">
                        {regularUsersOpen ? "▼" : "▶"}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-2 mt-2 space-y-2">
                      {groupedUsers.active.user.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-2 text-center">Nu există utilizatori standard</p>
                      ) : (
                        groupedUsers.active.user.map(user => renderUserItem(user))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CollapsibleContent>
              </Collapsible>
              
              <Collapsible 
                open={inactiveUsersOpen} 
                onOpenChange={setInactiveUsersOpen}
                className="border rounded-md p-2"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-gray-500" />
                    <h3 className="text-lg font-medium">Utilizatori inactivi</h3>
                    <Badge variant="outline" className="ml-2 bg-gray-100">
                      {groupedUsers.inactive.length}
                    </Badge>
                  </div>
                  <div className="text-gray-500">
                    {inactiveUsersOpen ? "▼" : "▶"}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 px-2">
                  {groupedUsers.inactive.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-2 text-center">Nu există utilizatori inactivi</p>
                  ) : (
                    groupedUsers.inactive.map(user => renderUserItem(user))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </CardContent>
      </Card>

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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
              }}
              tooltip="Închide această fereastră"
            >
              Închide
            </Button>
            <Button
              onClick={() => {
                setShowPasswordDialog(false);
                
                if (userToManage) {
                  setNewUserData({
                    username: userToManage.username,
                    password: tempPassword,
                    requirePasswordChange: true,
                    role: userToManage.role
                  });
                  setShowEmailMessageDialog(true);
                }
              }}
              tooltip="Deschide dialogul pentru a trimite email utilizatorului"
            >
              Trimite email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimbare parolă</DialogTitle>
            <DialogDescription>
              Pentru utilizatorul: {userToManage?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="generateRandomPasswordForChange"
                checked={generateRandomPassword}
                onChange={(e) => setGenerateRandomPassword(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="generateRandomPasswordForChange" className="cursor-pointer">
                Generează parolă aleatorie
              </Label>
            </div>
            
            {!generateRandomPassword && (
              <div className="space-y-2">
                <Label htmlFor="newPassword">Parolă nouă</Label>
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
                id="requirePasswordChangeDialog"
                checked={requirePasswordChange}
                onChange={(e) => setRequirePasswordChange(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="requirePasswordChangeDialog" className="cursor-pointer">
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

      <Dialog open={showChangeRoleDialog} onOpenChange={setShowChangeRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimbare rol</DialogTitle>
            <DialogDescription>
              Pentru utilizatorul: {userToManage?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">Rol nou</Label>
              <Select 
                value={newRole} 
                onValueChange={(value: UserRole) => setNewRole(value as UserRole)}
              >
                <SelectTrigger id="newRole">
                  <SelectValue placeholder="Selectează rolul" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="user">Utilizator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeRoleDialog(false)}>
              Anulează
            </Button>
            <Button onClick={handleChangeRole}>
              Schimbă rolul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EmailMessageDialog
        open={showEmailMessageDialog}
        onOpenChange={setShowEmailMessageDialog}
        username={newUserData.username}
        password={newUserData.password}
        requirePasswordChange={newUserData.requirePasswordChange}
        role={newUserData.role}
      />
    </div>
  );
};

export default UserManagement;
