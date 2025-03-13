
import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { toast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { User, UserRole } from "@/types";

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
  deactivateUser: (userId: string) => Promise<boolean>;
  reactivateUser: (userId: string) => Promise<boolean>;
  resetUserPassword: (userId: string) => Promise<string | null>;
  changeUserPassword: (userId: string, newPassword: string, requirePasswordChange?: boolean) => Promise<boolean>;
  updateUserRole: (userId: string, role: UserRole) => Promise<boolean>;
  initializeUserStatus: () => Promise<boolean>;
}

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
  deactivateUser: async () => false,
  reactivateUser: async () => false,
  resetUserPassword: async () => null,
  changeUserPassword: async () => false,
  updateUserRole: async () => false,
  initializeUserStatus: async () => false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");

      if (token && user) {
        // Verificăm dacă token-ul și datele utilizatorului există
        console.log("Auth check: Token și user găsite în localStorage");
        
        // Setăm și auth-token pentru cereri API
        localStorage.setItem("auth-token", token);
        
        setIsAuthenticated(true);
        setCurrentUser(JSON.parse(user));
      } else {
        console.log("Auth check: Nu s-au găsit token sau user în localStorage");
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'admin') {
      initializeUserStatus();
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [isAuthenticated]);

  const login = async (username: string, password: string): Promise<{
    success: boolean;
    requirePasswordChange?: boolean;
    tempToken?: string;
    message?: string;
    user?: User;
    token?: string;
  }> => {
    try {
      console.log("Sending login request for user:", username);
      
      const response = await axios.post("/api/login", { 
        username, 
        password
      });

      console.log("Login response from server:", response.data);

      if (response.data.success) {
        const userData = response.data.user;
        
        console.log("User data received from server:", userData);
        
        if (userData && !userData.lastLogin && response.data.lastLogin) {
          userData.lastLogin = response.data.lastLogin;
          console.log("Restructured lastLogin from response to user object:", userData);
        }
        
        if (userData) {
          console.log("Last login information:", userData.lastLogin);
          
          if (userData.active === undefined) {
            userData.active = true;
          }
        }
        
        // Check if password change is required before setting authentication
        const { requirePasswordChange, tempToken } = response.data;
        
        if (requirePasswordChange && tempToken) {
          console.log("Password change required. Redirecting to change password page.");
          navigate(`/change-password?tempToken=${tempToken}&username=${username}`);
          return {
            success: true,
            requirePasswordChange: true,
            tempToken: tempToken,
            user: userData,
            token: response.data.token
          };
        }
        
        // Dacă nu este necesară schimbarea parolei, setăm autentificarea
        const authToken = response.data.token;
        localStorage.setItem("token", authToken);
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Salvăm token-ul și pentru cereri API (pentru a fi siguri)
        localStorage.setItem("auth-token", authToken);
        
        // Setăm header-ul de autorizare pentru toate cererile axios
        axios.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
        console.log("Token setat în localStorage și headers axios:", authToken ? "Token prezent" : "Token lipsă");
        
        setIsAuthenticated(true);
        setCurrentUser(userData);
        
        return {
          success: true,
          user: userData,
          token: authToken
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

  const initializeUserStatus = async (): Promise<boolean> => {
    try {
      console.log("Initializing user statuses...");
      const response = await axios.post("/api/initialize-user-status", {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.data.success) {
        console.log("User statuses initialized successfully:", response.data);
        return true;
      } else {
        console.error("Failed to initialize user statuses:", response.data.message);
        return false;
      }
    } catch (error: any) {
      console.error("Error initializing user statuses:", error.message);
      return false;
    }
  };

  const logout = () => {
    console.log("Logout: se șterge token și user din localStorage");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-token"); // Ștergem și auth-token
    delete axios.defaults.headers.common["Authorization"];
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
        
        axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
        
        setIsAuthenticated(true);
        setCurrentUser(response.data.user);
        navigate("/");
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

  const changeUserPassword = async (userId: string, newPassword: string, requirePasswordChange: boolean = false): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await axios.post(
        `/api/users/${userId}/change-password`,
        { newPassword, requirePasswordChange },
        {
          headers: {
            Authorization: `Bearer ${token}`,
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

      console.log("getAllUsers response:", response.data);

      if (response.data.success) {
        const users = response.data.users;
        
        const processedUsers = users.map((user: any) => {
          console.log(`Processing user ${user.username}:`, user);
          
          if (user.lastLoginDate && user.lastLoginIp && !user.lastLogin) {
            user.lastLogin = {
              date: user.lastLoginDate,
              ipAddress: user.lastLoginIp
            };
            console.log(`Reconstructed lastLogin for ${user.username}:`, user.lastLogin);
          }
          
          if (user.active === undefined) {
            user.active = true;
          }
          
          return user;
        });
        
        console.log("Processed users with lastLogin:", processedUsers);
        return processedUsers;
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

  const deactivateUser = async (userId: string): Promise<boolean> => {
    try {
      if (userId === "1") {
        toast({
          title: "Operațiune interzisă",
          description: "Nu se poate dezactiva REALIZATORUL APLICAȚIEI",
          variant: "destructive",
        });
        return false;
      }
      
      const response = await axios.put(
        `/api/users/${userId}/status`,
        { active: false },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Utilizatorul a fost dezactivat cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la dezactivarea utilizatorului",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la dezactivarea utilizatorului",
        variant: "destructive",
      });
      return false;
    }
  };

  const reactivateUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await axios.put(
        `/api/users/${userId}/status`,
        { active: true },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (response.data.success) {
        toast({
          title: "Succes",
          description: "Utilizatorul a fost reactivat cu succes!",
        });
        return true;
      } else {
        toast({
          title: "Eroare",
          description: response.data.message || "Eroare la reactivarea utilizatorului",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error("Error reactivating user:", error);
      toast({
        title: "Eroare",
        description: error.response?.data?.message || "Eroare la reactivarea utilizatorului",
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

  if (!authChecked) {
    return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;
  }

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
        deactivateUser,
        reactivateUser,
        resetUserPassword,
        changeUserPassword,
        updateUserRole,
        initializeUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
