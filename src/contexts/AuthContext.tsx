import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User, UserRole, AuthState } from "@/types";
import { toast } from "@/components/ui/use-toast";
import axios from "axios";

interface LoginResponse {
  success: boolean;
  requirePasswordChange?: boolean;
  tempToken?: string;
  user?: User;
  message?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  getAllUsers: () => Promise<User[]>;
  createUser: (username: string, password: string, role: UserRole) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  resetUserPassword: (userId: string) => Promise<string | null>;
  changeUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STATE_KEY = "optizone-auth-state";
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedState = localStorage.getItem(AUTH_STATE_KEY);
    return savedState
      ? JSON.parse(savedState)
      : { isAuthenticated: false, currentUser: null };
  });

  // Initialize auth state from local storage
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (authState.isAuthenticated && authState.currentUser) {
        try {
          // Verify if the token is still valid with the server
          const response = await fetch(`${API_URL}/verify-auth`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth-token')}`
            }
          });
          
          if (!response.ok) {
            // If token is invalid, logout
            logout();
            return;
          }
          
          const data = await response.json();
          if (!data.valid) {
            logout();
          }
        } catch (error) {
          console.error("Error verifying authentication:", error);
          // On error, we keep the current state
        }
      }
    };
    
    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      // Make API call to login endpoint
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store auth token if provided
        if (data.token) {
          localStorage.setItem('auth-token', data.token);
        }
        
        const user = data.user;
        const newState = { isAuthenticated: true, currentUser: user };
        setAuthState(newState);
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(newState));
        
        if (!data.requirePasswordChange) {
          toast({
            title: "Autentificare reușită",
            description: `Bine ai venit, ${username}!`,
          });
        }
        
        return {
          success: true,
          requirePasswordChange: data.requirePasswordChange,
          tempToken: data.tempToken,
          user: user
        };
      } else {
        toast({
          title: "Autentificare eșuată",
          description: data.message || "Nume de utilizator sau parolă incorecte.",
          variant: "destructive",
        });
        return { 
          success: false,
          message: data.message || "Nume de utilizator sau parolă incorecte."
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Eroare de conexiune",
        description: "Nu s-a putut conecta la server.",
        variant: "destructive",
      });
      return { 
        success: false,
        message: "Nu s-a putut conecta la server."
      };
    }
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, currentUser: null });
    localStorage.removeItem(AUTH_STATE_KEY);
    localStorage.removeItem('auth-token');
    toast({
      title: "Deconectare reușită",
      description: "Te-ai deconectat cu succes.",
    });
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!authState.currentUser) return false;

    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          userId: authState.currentUser.id,
          oldPassword,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with new password
        const updatedUser = { ...authState.currentUser, password: newPassword };
        const newState = { ...authState, currentUser: updatedUser };
        setAuthState(newState);
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(newState));
        
        toast({
          title: "Succes",
          description: "Parola a fost schimbată cu succes.",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Eroare la schimbarea parolei.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error changing password:", error);
      
      // Fallback to local storage during development
      if (authState.currentUser.password !== oldPassword) {
        toast({
          title: "Eroare",
          description: "Parola actuală este incorectă.",
          variant: "destructive",
        });
        return false;
      }

      const savedUsers = localStorage.getItem("optizone-users");
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        const updatedUsers = users.map((u: User) =>
          u.id === authState.currentUser?.id
            ? { ...u, password: newPassword }
            : u
        );

        localStorage.setItem("optizone-users", JSON.stringify(updatedUsers));
      }

      // Update local state
      const updatedUser = { ...authState.currentUser, password: newPassword };
      const newState = { ...authState, currentUser: updatedUser };
      setAuthState(newState);
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(newState));

      toast({
        title: "Succes",
        description: "Parola a fost schimbată cu succes.",
      });
      return true;
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      // Only admin can get all users
      if (!authState.currentUser || authState.currentUser.role !== 'admin') {
        return [];
      }
      
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Filter out current user
        return data.users.filter((user: User) => user.id !== authState.currentUser?.id);
      } else {
        toast({
          title: "Eroare",
          description: "Eroare la obținerea listei de utilizatori.",
          variant: "destructive",
        });
        return [];
      }
    } catch (error) {
      console.error("Error getting users:", error);
      
      // Fallback to local storage during development
      const savedUsers = localStorage.getItem("optizone-users");
      const users = savedUsers ? JSON.parse(savedUsers) : [];
      return users.filter((user: User) => user.id !== authState.currentUser?.id);
    }
  };

  const createUser = async (username: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      // Only admin can create users
      if (!authState.currentUser || authState.currentUser.role !== 'admin') {
        toast({
          title: "Permisiune refuzată",
          description: "Nu aveți permisiunea de a crea utilizatori.",
          variant: "destructive",
        });
        return false;
      }
      
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ username, password, role }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Succes",
          description: `Utilizatorul ${username} a fost creat cu succes.`,
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Eroare la crearea utilizatorului.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error creating user:", error);
      
      // Fallback to local storage during development
      const savedUsers = localStorage.getItem("optizone-users");
      const users = savedUsers ? JSON.parse(savedUsers) : [];
      
      // Check if username already exists
      if (users.some((user: User) => user.username === username)) {
        toast({
          title: "Eroare",
          description: "Numele de utilizator există deja.",
          variant: "destructive",
        });
        return false;
      }
      
      // Generate a new ID
      const newId = Math.max(...users.map((user: User) => parseInt(user.id)), 0) + 1;
      
      const newUser: User = {
        id: newId.toString(),
        username,
        password,
        role,
      };
      
      const updatedUsers = [...users, newUser];
      localStorage.setItem("optizone-users", JSON.stringify(updatedUsers));
      
      toast({
        title: "Succes",
        description: `Utilizatorul ${username} a fost creat cu succes.`,
      });
      return true;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      // Only admin can delete users
      if (!authState.currentUser || authState.currentUser.role !== 'admin') {
        toast({
          title: "Permisiune refuzată",
          description: "Nu aveți permisiunea de a șterge utilizatori.",
          variant: "destructive",
        });
        return false;
      }
      
      // Cannot delete yourself
      if (userId === authState.currentUser.id) {
        toast({
          title: "Eroare",
          description: "Nu vă puteți șterge propriul cont.",
          variant: "destructive",
        });
        return false;
      }
      
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Succes",
          description: "Utilizatorul a fost șters cu succes.",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Eroare la ștergerea utilizatorului.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      
      // Fallback to local storage during development
      const savedUsers = localStorage.getItem("optizone-users");
      if (!savedUsers) return false;
      
      const users = JSON.parse(savedUsers);
      const updatedUsers = users.filter((user: User) => user.id !== userId);
      
      // If no users were removed, the ID was invalid
      if (updatedUsers.length === users.length) {
        toast({
          title: "Eroare",
          description: "Utilizatorul nu a fost găsit.",
          variant: "destructive",
        });
        return false;
      }
      
      localStorage.setItem("optizone-users", JSON.stringify(updatedUsers));
      
      toast({
        title: "Succes",
        description: "Utilizatorul a fost șters cu succes.",
      });
      return true;
    }
  };

  const resetUserPassword = async (userId: string): Promise<string | null> => {
    try {
      // Only admin can reset passwords
      if (!authState.currentUser || authState.currentUser.role !== 'admin') {
        toast({
          title: "Permisiune refuzată",
          description: "Nu aveți permisiunea de a reseta parole.",
          variant: "destructive",
        });
        return null;
      }
      
      const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Succes",
          description: "Parola utilizatorului a fost resetată cu succes.",
        });
        return data.temporaryPassword;
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Eroare la resetarea parolei.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      
      // Fallback to local storage during development
      const savedUsers = localStorage.getItem("optizone-users");
      if (!savedUsers) return null;
      
      const users = JSON.parse(savedUsers);
      const user = users.find((u: User) => u.id === userId);
      
      if (!user) {
        toast({
          title: "Eroare",
          description: "Utilizatorul nu a fost găsit.",
          variant: "destructive",
        });
        return null;
      }
      
      // Generate random password
      const tempPassword = generateRandomPassword();
      
      // Update user with temporary password
      const updatedUsers = users.map((u: User) =>
        u.id === userId ? { ...u, password: tempPassword, requirePasswordChange: true } : u
      );
      
      localStorage.setItem("optizone-users", JSON.stringify(updatedUsers));
      
      toast({
        title: "Succes",
        description: "Parola utilizatorului a fost resetată cu succes.",
      });
      return tempPassword;
    }
  };

  const changeUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
    try {
      // Only admin can change other users' passwords
      if (!authState.currentUser || authState.currentUser.role !== 'admin') {
        toast({
          title: "Permisiune refuzată",
          description: "Nu aveți permisiunea de a schimba parole.",
          variant: "destructive",
        });
        return false;
      }
      
      const response = await fetch(`${API_URL}/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ newPassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Succes",
          description: "Parola utilizatorului a fost schimbată cu succes.",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: data.message || "Eroare la schimbarea parolei.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error changing user password:", error);
      
      // Fallback to local storage during development
      const savedUsers = localStorage.getItem("optizone-users");
      if (!savedUsers) return false;
      
      const users = JSON.parse(savedUsers);
      const user = users.find((u: User) => u.id === userId);
      
      if (!user) {
        toast({
          title: "Eroare",
          description: "Utilizatorul nu a fost găsit.",
          variant: "destructive",
        });
        return false;
      }
      
      // Update user password
      const updatedUsers = users.map((u: User) =>
        u.id === userId ? { ...u, password: newPassword, requirePasswordChange: false } : u
      );
      
      localStorage.setItem("optizone-users", JSON.stringify(updatedUsers));
      
      toast({
        title: "Succes",
        description: "Parola utilizatorului a fost schimbată cu succes.",
      });
      return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        currentUser: authState.currentUser,
        login,
        logout,
        changePassword,
        getAllUsers,
        createUser,
        deleteUser,
        resetUserPassword,
        changeUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Helper function to generate random password
function generateRandomPassword(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
