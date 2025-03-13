
export interface Machine {
  id: string;
  ip: string;
  hostname: string;
  os: "ubuntu_20.04" | "ubuntu_22.04";
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
