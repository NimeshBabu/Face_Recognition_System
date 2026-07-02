import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { loadAuthSession } from "../lib/authStorage";

interface ProtectedRouteProps {
  role: "user" | "police" | "admin";
  children: ReactNode;
}

export default function ProtectedRoute({
  role,
  children,
}: ProtectedRouteProps) {
  const session = loadAuthSession();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (session.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
