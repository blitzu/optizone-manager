
export type UserRole = "admin" | "user";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  active: boolean;
  lastLogin?: {
    date: string;
    ipAddress: string;
  };
}

export interface Machine {
  id: string;
  hostname: string;
  ip: string;
  sshUsername?: string;
  sshPassword?: string;
}

export interface MachineResponse {
  success: boolean;
  message?: string;
  machines?: Machine[];
  machine?: Machine;
}

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: string;
  message: string;
  originalLine?: string;
}

export interface LogRequest {
  machineId?: string;
  ip: string;
  sshUsername?: string;
  sshPassword?: string;
  liveMode?: boolean;
  startDate?: string;
  endDate?: string;
  applicationName?: string;
}

export interface SSHCommandRequest {
  ip: string;
  sshUsername?: string;
  sshPassword?: string;
  command: string;
}
