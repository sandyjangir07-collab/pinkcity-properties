import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import NotRegistered from "./NotRegistered";
import PendingApprovalNotice from "./PendingApprovalNotice";
import Today from "./Today";
import { BrandedLoader } from "../components/ui/BrandedLoader";

export default function Home() {
  const { isAdmin, employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  if (isAdmin) return <Today />;
  if (!employee) return <NotRegistered />;
  if (employee.profile_status === "pending_review") return <PendingApprovalNotice />;
  return <Navigate to="/leads" replace />;
}
