
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User, UserRole, AuthState } from "@/types";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = "optizone-users";
const AUTH_STATE_KEY = "optizone-auth-state";

// Admin și un utilizator implicit pentru demo
const DEFAULT_USERS: User[] = [
  {
    id: "1",
    username: "admin",
    password: "admin123", // Doar pentru demo! În producție folosim hash-uri
    role: "admin",
  },
  {
    id: "2",
    username: "user",
    password: "user123", // Doar pentru demo!
    role: "user",
  },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedState = localStorage.getItem(AUTH_STATE_KEY);
    return savedState
      ? JSON.parse(savedState)
      : { isAuthenticated: false, currentUser: null };
  });

  // Inițializăm utilizatorii
  useEffect(() => {
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!savedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  const getUsers = (): User[] => {
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    return savedUsers ? JSON.parse(savedUsers) : DEFAULT_USERS;
  };

  const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const login = (username: string, password: string): boolean => {
    const users = getUsers();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      const newState = { isAuthenticated: true, currentUser: user };
      setAuthState(newState);
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(newState));
      toast({
        title: "Autentificare reușită",
        description: `Bine ai venit, ${username}!`,
      });
      return true;
    }
    
    toast({
      title: "Autentificare eșuată",
      description: "Nume de utilizator sau parolă incorecte.",
      variant: "destructive",
    });
    return false;
  };

  const logout = () => {
    setAuthState({ isAuthenticated: false, currentUser: null });
    localStorage.removeItem(AUTH_STATE_KEY);
    toast({
      title: "Deconectare reușită",
      description: "Te-ai deconectat cu succes.",
    });
  };

  const changePassword = (oldPassword: string, newPassword: string): boolean => {
    if (!authState.currentUser) return false;

    if (authState.currentUser.password !== oldPassword) {
      toast({
        title: "Eroare",
        description: "Parola actuală este incorectă.",
        variant: "destructive",
      });
      return false;
    }

    const users = getUsers();
    const updatedUsers = users.map((u) =>
      u.id === authState.currentUser?.id
        ? { ...u, password: newPassword }
        : u
    );

    saveUsers(updatedUsers);

    // Actualizăm și starea curentă
    const updatedUser = { ...authState.currentUser, password: newPassword };
    const newState = { ...authState, currentUser: updatedUser };
    setAuthState(newState);
    localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(newState));

    toast({
      title: "Succes",
      description: "Parola a fost schimbată cu succes.",
    });
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        currentUser: authState.currentUser,
        login,
        logout,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
