import { Navigate, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "./AuthContext";

export default function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main style={{ padding: "24px", color: "#64748b" }}>Checking session...</main>;
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from || "/dashboard";
    return <Navigate to={from} replace />;
  }

  return children;
}
