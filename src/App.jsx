import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { RequireAuth, RequireAdmin } from "./components/RouteGuards";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Directory from "./pages/Directory";
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
import Sales from "./pages/Sales";
import Tasks from "./pages/Tasks";
import Menu from "./pages/Menu";
import Commissions from "./pages/Commissions";
import ResalePlots from "./pages/ResalePlots";
import ResalePlotDetail from "./pages/ResalePlotDetail";
import ResalePlotForm from "./pages/ResalePlotForm";

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
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/team" element={<Directory />} />
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
              <Route path="/resale" element={<ResalePlots />} />
              <Route
                path="/resale/new"
                element={
                  <RequireAdmin>
                    <ResalePlotForm />
                  </RequireAdmin>
                }
              />
              <Route
                path="/resale/:id/edit"
                element={
                  <RequireAdmin>
                    <ResalePlotForm />
                  </RequireAdmin>
                }
              />
              <Route path="/resale/:id" element={<ResalePlotDetail />} />
              <Route
                path="/approvals"
                element={
                  <RequireAdmin>
                    <Approvals />
                  </RequireAdmin>
                }
              />
              <Route
                path="/sales"
                element={
                  <RequireAdmin>
                    <Sales />
                  </RequireAdmin>
                }
              />
              <Route
                path="/commissions"
                element={
                  <RequireAdmin>
                    <Commissions />
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
