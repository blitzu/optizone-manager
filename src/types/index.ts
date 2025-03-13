
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
