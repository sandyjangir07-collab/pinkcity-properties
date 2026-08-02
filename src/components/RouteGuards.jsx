import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Spinner() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" />
    </div>
  );
}

export function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading || session === undefined) return <Spinner />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
