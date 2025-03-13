export type UserRole = "admin" | "user";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  lastLogin?: {
    date: string;
    ipAddress: string;
  };
}
