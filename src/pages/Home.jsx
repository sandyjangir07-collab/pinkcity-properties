import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import CreateProfile from "./CreateProfile";
import PendingApprovalNotice from "./PendingApprovalNotice";
import Directory from "./Directory";

export default function Home() {
  const { isAdmin, employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div className="center-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (isAdmin) return <Directory />;
  if (!employee) return <CreateProfile />;
  if (employee.profile_status === "pending_review") return <PendingApprovalNotice />;
  return <Navigate to={`/employees/${employee.id}`} replace />;
}
