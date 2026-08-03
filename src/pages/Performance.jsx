import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { STATUS_LABELS } from "../lib/leadConstants";
import { Sheet, SheetHeader } from "../components/ui/Sheet";
import { Pill, StatCard } from "../components/ui/primitives";
import { initials } from "../lib/utils";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";

const EASE = [0.22, 1, 0.36, 1];

export default function Performance() {
  const [members, setMembers] = useState(null);
  const [totals, setTotals] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  async function load() {
    const [{ data: listings }, { data: visits }, { data: leads }, { data: profiles }] = await Promise.all([
      sb.from("listings").select("uid,submitter_name,status"),
      sb.from("visits").select("logged_by,logged_by_name,visitor_name,visitor_phone,listing_title,visit_date,visit_time"),
      sb.from("leads").select("id,created_by,created_by_name,status,name,phone,preferred_location,lead_number"),
      sb.from("profiles").select("id,full_name,email,role"),
    ]);

    setTotals({
      listings: (listings || []).length,
      visits: (visits || []).length,
      leads: (leads || []).length,
      closed: (leads || []).filter((l) => l.status === "closed").length,
    });

    const byId = {};
    (profiles || [])
      .filter((p) => p.role !== "admin")
      .forEach((p) => {
        byId[p.id] = { name: p.full_name || p.email, email: p.email, listings: 0, visits: 0, leads: 0, closed: 0, leadList: [], visitList: [] };
      });
    const ensure = (id, fallbackName) => {
      if (id && !byId[id]) byId[id] = { name: fallbackName || "Team", email: "", listings: 0, visits: 0, leads: 0, closed: 0, leadList: [], visitList: [] };
    };
    (listings || []).forEach((l) => ensure(l.uid, l.submitter_name));
    (visits || []).forEach((v) => ensure(v.logged_by, v.logged_by_name));
    (leads || []).forEach((l) => ensure(l.created_by, l.created_by_name));

    (listings || []).forEach((l) => {
      if (byId[l.uid]) byId[l.uid].listings++;
    });
    (visits || []).forEach((v) => {
      if (byId[v.logged_by]) {
        byId[v.logged_by].visits++;
        byId[v.logged_by].visitList.push(v);
      }
    });
    (leads || []).forEach((l) => {
      if (byId[l.created_by]) {
        byId[l.created_by].leads++;
        byId[l.created_by].leadList.push(l);
        if (l.status === "closed") byId[l.created_by].closed++;
      }
    });

    const list = Object.entries(byId).sort((a, b) => b[1].listings + b[1].visits + b[1].leads - (a[1].listings + a[1].visits + a[1].leads));
    setMembers(list);
  }

  useEffect(() => {
    load();
  }, []);

  const detail = detailId && members ? members.find(([id]) => id === detailId) : null;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Admin</div>
      <h1 className="font-display text-3xl text-ink mb-2">Performance</h1>
      <p className="text-ink/50 text-sm mb-8">Team activity across listings, leads, and site visits.</p>

      {totals && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Listings" value={totals.listings} tone="stone" />
          <StatCard label="Site Visits" value={totals.visits} tone="jali" />
          <StatCard label="Leads" value={totals.leads} tone="brass" />
          <StatCard label="Closed" value={totals.closed} tone="emerald" />
        </div>
      )}

      {members === null ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-3xl text-center py-16 text-ink/40">
          <div className="font-display text-lg text-ink">No team members yet</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(([id, m], i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (i % 9) * 0.04, ease: EASE }}
              onClick={() => setDetailId(id)}
              className="bg-white rounded-3xl p-5 cursor-pointer hover:shadow-[0_16px_36px_-20px_rgba(43,21,18,0.2)] transition-shadow"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center text-sm font-medium shrink-0">{initials(m.name)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{m.name}</div>
                  <div className="text-xs text-ink/40 truncate">{m.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <MiniStat n={m.listings} label="Listings" />
                <MiniStat n={m.leads} label="Leads" />
                <MiniStat n={m.visits} label="Site Visits" />
                <MiniStat n={m.closed} label="Closed" tone="green" />
              </div>
              <div className="text-center text-xs font-semibold text-stone-600 mt-3">View leads &amp; visits →</div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet open={!!detail} onClose={() => setDetailId(null)} maxWidth="max-w-md">
        {detail && (
          <>
            <SheetHeader title={detail[1].name} sub={detail[1].email} />
            <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Leads</div>
            {detail[1].leadList.length === 0 ? (
              <div className="text-sm text-ink/40 py-2">No leads yet.</div>
            ) : (
              <div className="space-y-2 mb-4">
                {detail[1].leadList.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => { setDetailId(null); setDetailLeadId(l.id); }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink">{l.name || "—"} <span className="text-xs font-medium text-ink/35">PC{l.lead_number}</span></div>
                      <div className="text-xs text-ink/40">{[l.phone, l.preferred_location].filter(Boolean).join(" · ")}</div>
                    </div>
                    <Pill tone="stone">{STATUS_LABELS[l.status] || l.status}</Pill>
                  </div>
                ))}
              </div>
            )}

            <div className="h-px bg-ink/[0.06] my-4" />
            <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Site Visits</div>
            {detail[1].visitList.length === 0 ? (
              <div className="text-sm text-ink/40 py-2">No visits logged yet.</div>
            ) : (
              <div className="space-y-2">
                {detail[1].visitList.map((v, i) => {
                  const d = v.visit_date ? new Date(v.visit_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-ink">{v.visitor_name || "—"}</div>
                        <div className="text-xs text-ink/40">{[v.listing_title, v.visitor_phone].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="text-xs font-semibold text-ink/45 text-right">
                        {d}
                        {v.visit_time && <div>{v.visit_time}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Sheet>

      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onChanged={load}
        onEdit={() => setDetailLeadId(null)}
        onScheduleVisit={(t) => setVisitTarget(t)}
        onScheduleCall={(t) => setCallTarget(t)}
        onDeleted={() => {
          setDetailLeadId(null);
          load();
        }}
      />
      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); load(); }} />
      <ScheduleCallModal target={callTarget} onClose={() => setCallTarget(null)} onSaved={() => setCallTarget(null)} />
    </div>
  );
}


function MiniStat({ n, label, tone }) {
  return (
    <div className="text-center bg-stone-50/60 rounded-xl py-2">
      <div className={`font-display text-lg ${tone === "green" ? "text-emerald-600" : "text-ink"}`}>{n}</div>
      <div className="text-[10px] text-ink/40">{label}</div>
    </div>
  );
}
