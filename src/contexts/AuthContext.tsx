
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User, UserRole, AuthState } from "@/types";
import { toast } from "@/components/ui/use-toast";

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => boolean;
  getAllUsers: () => User[];
  createUser: (username: string, password: string, role: UserRole) => boolean;
  deleteUser: (userId: string) => boolean;
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

  // Inițializăm utilizatorii și ne asigurăm că utilizatorii impliciti sunt mereu disponibili
  useEffect(() => {
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (!savedUsers) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    } else {
      // Ne asigurăm că utilizatorii impliciti există mereu
      const users = JSON.parse(savedUsers);
      let usersChanged = false;
      
      // Verificăm dacă admin există
      if (!users.some(u => u.username === 'admin')) {
        users.push(DEFAULT_USERS[0]);
        usersChanged = true;
      }
      
      // Verificăm dacă user există
      if (!users.some(u => u.username === 'user')) {
        users.push(DEFAULT_USERS[1]);
        usersChanged = true;
      }
      
      // Salvăm utilizatorii actualizați dacă au fost modificări
      if (usersChanged) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
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

  const getAllUsers = (): User[] => {
    const users = getUsers();
    if (!authState.currentUser) return users;
    return users.filter(user => user.id !== authState.currentUser?.id);
  };

  const createUser = (username: string, password: string, role: UserRole): boolean => {
    const users = getUsers();
    
    // Check if username already exists
    if (users.some(user => user.username === username)) {
      toast({
        title: "Eroare",
        description: "Numele de utilizator există deja.",
        variant: "destructive",
      });
      return false;
    }

    // Generate a new ID
    const newId = Math.max(...users.map(user => parseInt(user.id)), 0) + 1;
    
    const newUser: User = {
      id: newId.toString(),
      username,
      password,
      role,
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);

    toast({
      title: "Succes",
      description: `Utilizatorul ${username} a fost creat cu succes.`,
    });
    return true;
  };

  const deleteUser = (userId: string): boolean => {
    const users = getUsers();
    
    // Cannot delete yourself
    if (userId === authState.currentUser?.id) {
      toast({
        title: "Eroare",
        description: "Nu vă puteți șterge propriul cont.",
        variant: "destructive",
      });
      return false;
    }

    const updatedUsers = users.filter(user => user.id !== userId);
    
    // If no users were removed, the ID was invalid
    if (updatedUsers.length === users.length) {
      toast({
        title: "Eroare",
        description: "Utilizatorul nu a fost găsit.",
        variant: "destructive",
      });
      return false;
    }

    saveUsers(updatedUsers);
    
    toast({
      title: "Succes",
      description: "Utilizatorul a fost șters cu succes.",
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
        getAllUsers,
        createUser,
        deleteUser,
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
