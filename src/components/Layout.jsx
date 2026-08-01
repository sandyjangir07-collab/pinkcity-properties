import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Layout() {
  const { isAdmin, signOut, profile } = useAuth();

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-brand">
          <img src="/logo.png" alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
          PinkCity CRM
        </div>
        <div className="topbar-nav">
          <NavLink to="/" end className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Team
          </NavLink>
          <NavLink to="/today" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Today
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Attendance
          </NavLink>
          <NavLink to="/schedule" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Schedule
          </NavLink>
          <NavLink to="/quotation" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Quotation
          </NavLink>
          {isAdmin && (
            <NavLink to="/performance" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
              Performance
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/blogs" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
              Blogs
            </NavLink>
          )}
          <NavLink to="/leads" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Leads
          </NavLink>
          <NavLink to="/listings" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Listings
          </NavLink>
          <NavLink to="/plots" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
            Plots &amp; Tokens
          </NavLink>
          {isAdmin && (
            <NavLink to="/approvals" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
              Approvals
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/commission-slabs" className={({ isActive }) => "topbar-link" + (isActive ? " active" : "")}>
              Commission Slabs
            </NavLink>
          )}
        </div>
        <div className="topbar-user">
          <span>{profile?.full_name || profile?.email}</span>
          <button className="topbar-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
