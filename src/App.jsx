import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { RequireAuth, RequireAdmin } from "./components/RouteGuards";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Today from "./pages/Today";
import Attendance from "./pages/Attendance";
import Schedule from "./pages/Schedule";
import Quotation from "./pages/Quotation";
import Performance from "./pages/Performance";
import Blogs from "./pages/Blogs";
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
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/quotation" element={<Quotation />} />
              <Route
                path="/performance"
                element={
                  <RequireAdmin>
                    <Performance />
                  </RequireAdmin>
                }
              />
              <Route
                path="/blogs"
                element={
                  <RequireAdmin>
                    <Blogs />
                  </RequireAdmin>
                }
              />
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
