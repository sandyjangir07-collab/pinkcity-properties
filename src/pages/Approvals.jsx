import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sb } from "../lib/supabase";
import { initials } from "../lib/utils";
import { useToast } from "../hooks/useToast";
import { Card, SectionTitle } from "../components/ui/primitives";
import { BrandedLoader } from "../components/ui/BrandedLoader";

export default function Approvals() {
  const [pendingProfiles, setPendingProfiles] = useState(null);
  const [pendingHierarchy, setPendingHierarchy] = useState([]);
  const [names, setNames] = useState({});
  const showToast = useToast();

  async function load() {
    const [{ data: profiles }, { data: hier }] = await Promise.all([
      sb.from("employees").select("*").eq("profile_status", "pending_review").order("created_at"),
      sb.from("employee_hierarchy").select("*").eq("status", "pending"),
    ]);
    setPendingProfiles(profiles || []);
    setPendingHierarchy(hier || []);
    const ids = Array.from(new Set((hier || []).flatMap((h) => [h.junior_id, h.senior_id])));
    if (ids.length) {
      const { data } = await sb.rpc("get_hierarchy_names", { p_ids: ids });
      setNames(Object.fromEntries((data || []).map((r) => [r.id, r])));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respondProfile(employeeId, approve) {
    const { error } = await sb.rpc("approve_employee_profile", { p_employee_id: employeeId, p_approve: approve });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(approve ? "Profile approved." : "Profile rejected.");
    load();
  }

  async function respondHierarchy(requestId, approve) {
    const { error } = await sb.rpc("respond_hierarchy_request", { p_request_id: requestId, p_approve: approve });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(approve ? "Request approved." : "Request rejected.");
    load();
  }

  if (pendingProfiles === null) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Admin</div>
      <h1 className="font-display text-[28px] text-ink mb-2">Pending Approvals</h1>
      <p className="text-ink/50 text-sm mb-8">New profiles and hierarchy requests waiting for review.</p>

      <div className="space-y-4">
        <Card>
          <SectionTitle>Pending Profiles</SectionTitle>
          {pendingProfiles.length === 0 && <div className="text-sm text-ink/40">Nothing pending.</div>}
          <div className="space-y-3">
            {pendingProfiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <Link to={`/employees/${p.id}`} className="flex items-center gap-3 min-w-0 no-underline text-inherit">
                  <div className="w-10 h-10 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                    {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : initials(p.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{p.full_name}</div>
                    <div className="text-xs text-ink/45 truncate">{p.email || p.mobile || "—"}</div>
                  </div>
                </Link>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => respondProfile(p.id, true)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                  <button onClick={() => respondProfile(p.id, false)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Pending Hierarchy Requests</SectionTitle>
          {pendingHierarchy.length === 0 && <div className="text-sm text-ink/40">Nothing pending.</div>}
          <div className="space-y-3">
            {pendingHierarchy.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2">
                <div className="text-sm text-ink">{names[h.junior_id]?.full_name || "—"} reports to {names[h.senior_id]?.full_name || "—"}</div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => respondHierarchy(h.id, true)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                  <button onClick={() => respondHierarchy(h.id, false)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
