
export interface Machine {
  id: string;
  ip: string;
  hostname: string;
}

export interface LogRequest {
  machineId: string;
  startDate?: string;
  endDate?: string;
  liveMode: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
}

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  username: string;
  password: string; // În producție, niciodată nu stocăm parole în plaintext
  role: UserRole;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}
