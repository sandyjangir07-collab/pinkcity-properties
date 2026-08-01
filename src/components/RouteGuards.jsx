import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading || session === undefined) {
    return (
      <div className="page">
        <div className="center-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="page">
        <div className="center-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
