
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Verificăm dacă utilizatorul are rolul necesar (dacă este specificat)
  if (requiredRole && currentUser?.role !== requiredRole && currentUser?.role !== "admin") {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
