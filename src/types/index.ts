
export interface Machine {
  id: string;
  ip: string;
  hostname: string;
  sshUsername?: string;
  sshPassword?: string;
}

export interface LogRequest {
  machineId: string;
  ip: string;
  sshUsername?: string;
  sshPassword?: string;
  startDate?: string;
  endDate?: string;
  liveMode: boolean;
  applicationName?: string;
}

export interface SSHCommandRequest {
  ip: string;
  sshUsername?: string;
  sshPassword?: string;
  command: string;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  syslogIdentifier?: string;
  originalLine?: string; // Added to help with debugging and formatting
}

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  username: string;
  password: string; // În producție, niciodată nu stocăm parole în plaintext
  role: UserRole;
  requirePasswordChange?: boolean;
  tempToken?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export interface SSHConnectionResult {
  success: boolean;
  message: string;
}
