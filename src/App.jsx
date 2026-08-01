import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { RequireAuth, RequireAdmin } from "./components/RouteGuards";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Today from "./pages/Today";
import EmployeeProfile from "./pages/EmployeeProfile";
import Leads from "./pages/Leads";
import Listings from "./pages/Listings";
import Plots from "./pages/Plots";
import Approvals from "./pages/Approvals";
import CommissionSlabs from "./pages/CommissionSlabs";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/today" element={<Today />} />
              <Route path="/employees/:id" element={<EmployeeProfile />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/plots" element={<Plots />} />
              <Route
                path="/approvals"
                element={
                  <RequireAdmin>
                    <Approvals />
                  </RequireAdmin>
                }
              />
              <Route
                path="/commission-slabs"
                element={
                  <RequireAdmin>
                    <CommissionSlabs />
                  </RequireAdmin>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
