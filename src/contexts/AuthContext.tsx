import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { User, UserRole } from "@/types";

// Define the shape of our authentication context
interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{
    success: boolean;
    requirePasswordChange?: boolean;
    tempToken?: string;
    message?: string;
    user?: User;
    token?: string;
  }>;
  logout: () => void;
  changeTempPassword: (username: string, tempToken: string, newPassword: string) => Promise<boolean>;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<boolean>;
  getAllUsers: () => Promise<User[]>;
  createUser: (username: string, password: string, role: UserRole, requirePasswordChange?: boolean) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  resetUserPassword: (userId: string) => Promise<string | null>;
  changeUserPassword: (userId: string, newPassword: string, requirePasswordChange?: boolean) => Promise<boolean>;
  updateUserRole: (userId: string, role: UserRole) => Promise<boolean>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  currentUser: null,
  login: async () => ({ success: false }),
  logout: () => {},
  changeTempPassword: async () => false,
  changePassword: async () => false,
  getAllUsers: async () => [],
  createUser: async () => false,
  deleteUser: async () => false,
  resetUserPassword: async () => null,
  changeUserPassword: async () => false,
  updateUserRole: async () => false,
});

// AuthProvider component to wrap the app and provide the context
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(user));
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, [location]);

  const login = async (username: string, password: string): Promise<{
    success: boolean;
    requirePasswordChange?: boolean;
    tempToken?: string;
    message?: string;
    user?: User;
    token?: string;
  }> => {
    try {
      const response = await axios.post("/api/login", { username, password });

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setIsAuthenticated(true);
        setCurrentUser(response.data.user);
        
        const { requirePasswordChange, tempToken } = response.data;
        
        if (requirePasswordChange && tempToken) {
          navigate(`/change-password?tempToken=${tempToken}`);
        } else {
          navigate("/");
        }
        
        return {
          success: true,
          requirePasswordChange: response.data.requirePasswordChange,
          tempToken: response.data.tempToken,
          user: response.data.user,
          token: response.data.token
        };
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Nume de utilizator sau parolă incorecte",
          variant: "destructive",
        });
        return {
          success: false,
          message: response.data.message || "Nume de utilizator sau parolă incorecte"
        };
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Nume de utilizator sau parolă incorecte",
        variant: "destructive",
      });
      return {
        success: false,
        message: error.response?.data?.message || "Nume de utilizator sau parolă incorecte"
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate("/login");
  };
  
  const changeTempPassword = async (username: string, tempToken: string, newPassword: string): Promise<boolean> => {
    try {
      const response = await axios.post("/api/change-temp-password", { username, tempToken, newPassword });
      
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setIsAuthenticated(true);
        setCurrentUser(response.data.user);
        navigate("/machines");
        toast({
          title: "Succes",
          description: "Parola a fost schimbată cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la schimbarea parolei",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error changing temporary password:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la schimbarea parolei",
        variant: "destructive",
      });
      return false;
    }
  };

  const changePassword = async (userId: string, oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const response = await axios.post(
        "/api/change-password",
        { userId, oldPassword, newPassword },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Parola a fost schimbată cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la schimbarea parolei",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la schimbarea parolei",
        variant: "destructive",
      });
      return false;
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const response = await axios.get("/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        return response.data.users;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Nu s-au putut încărca utilizatorii",
          variant: "destructive",
        });
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Nu s-au putut încărca utilizatorii",
        variant: "destructive",
      });
      return [];
    }
  };

  const createUser = async (username: string, password: string, role: UserRole, requirePasswordChange: boolean = true): Promise<boolean> => {
    try {
      const response = await axios.post(
        "/api/users",
        { username, password, role, requirePasswordChange },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Utilizatorul a fost creat cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la crearea utilizatorului",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la crearea utilizatorului",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await axios.delete(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Utilizatorul a fost șters cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la ștergerea utilizatorului",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la ștergerea utilizatorului",
        variant: "destructive",
      });
      return false;
    }
  };

  const resetUserPassword = async (userId: string): Promise<string | null> => {
    try {
      const response = await axios.post(
        `/api/users/${userId}/reset-password`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Parola a fost resetată cu succes!",
        });
        return response.data.temporaryPassword;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la resetarea parolei",
          variant: "destructive",
        });
        return null;
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la resetarea parolei",
        variant: "destructive",
      });
      return null;
    }
  };

  const changeUserPassword = async (userId: string, newPassword: string, requirePasswordChange: boolean = false): Promise<boolean> => {
    try {
      const response = await axios.post(
        `/api/users/${userId}/change-password`,
        { newPassword, requirePasswordChange },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Parola a fost schimbată cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la schimbarea parolei",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la schimbarea parolei",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateUserRole = async (userId: string, role: UserRole): Promise<boolean> => {
    try {
      if (userId === "1") {
        toast({
          title: "Operațiune interzisă",
          description: "Nu se poate modifica rolul pentru REALIZATORUL APLICAȚIEI",
          variant: "destructive",
        });
        return false;
      }
      
      const response = await axios.put(
        `/api/users/${userId}/role`, 
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (response.data.success) {
        toast({
          title: "Succes",
          description: response.data.message || "Rolul utilizatorului a fost actualizat cu succes",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Nu s-a putut actualiza rolul utilizatorului",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Nu s-a putut actualiza rolul utilizatorului",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        changeTempPassword,
        changePassword,
        getAllUsers,
        createUser,
        deleteUser,
        resetUserPassword,
        changeUserPassword,
        updateUserRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
