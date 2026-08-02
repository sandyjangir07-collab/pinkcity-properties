import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { STATUS_LABELS, SOURCE_LABELS, STATUS_TEXT, isStaleLead, timeAgo, waNumberFor } from "../lib/leadConstants";
import { Button } from "../components/ui/button";
import { Pill } from "../components/ui/primitives";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";

const CRM_ADMIN_EMAIL = "sandyjangir07@gmail.com";
const EASE = [0.22, 1, 0.36, 1];

export default function Leads() {
  const { user } = useAuth();
  const isAdmin = user?.email === CRM_ADMIN_EMAIL;
  const [leads, setLeads] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formTarget, setFormTarget] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  async function load() {
    let q = sb.from("leads").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    if (!isAdmin) q = q.eq("created_by", user.id);
    const { data } = await q;
    setLeads(data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, refreshKey]);

  const term = search.trim().toLowerCase();
  const filtered = (leads || []).filter((l) => {
    if (!term) return true;
    return (
      (l.name || "").toLowerCase().includes(term) ||
      (l.phone || "").toLowerCase().includes(term) ||
      (l.preferred_location || "").toLowerCase().includes(term) ||
      ("pc" + l.lead_number).includes(term.replace(/\s/g, ""))
    );
  });

  const stats = {
    new: filtered.filter((l) => l.status === "new").length,
    active: filtered.filter((l) => !["closed", "lost", "new"].includes(l.status)).length,
    closed: filtered.filter((l) => l.status === "closed").length,
    total: filtered.length,
  };

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-3xl text-ink mb-2">Leads</h1>
      <p className="text-ink/50 text-sm mb-8">Track every enquiry from first contact to close.</p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <MiniStat label="New" value={stats.new} />
        <MiniStat label="Active" value={stats.active} />
        <MiniStat label="Closed" value={stats.closed} />
        <MiniStat label="Total" value={stats.total} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <input className="field-input flex-1 min-w-[180px]" placeholder="Search name, phone, PC#…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="field-input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(STATUS_TEXT).map((s) => (<option key={s} value={s}>{STATUS_TEXT[s]}</option>))}
        </select>
        <Button onClick={() => setFormTarget("new")} className="ml-auto">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Add Lead
        </Button>
      </div>

      {leads === null ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl text-center py-16 text-ink/40">
          <div className="font-display text-lg text-ink mb-1">No leads found</div>
          <p className="text-sm">Add your first lead or adjust the filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l, i) => (
            <LeadCard key={l.id} lead={l} index={i} onOpen={() => setDetailLeadId(l.id)} />
          ))}
        </div>
      )}

      <LeadFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={({ isNew, lead }) => {
          setFormTarget(null);
          refresh();
          if (isNew) setVisitTarget({ leadId: lead.id, name: lead.name, phone: lead.phone });
        }}
      />
      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onChanged={refresh}
        onEdit={(id) => {
          setDetailLeadId(null);
          setFormTarget(id);
        }}
        onScheduleVisit={(t) => setVisitTarget(t)}
        onScheduleCall={(t) => setCallTarget(t)}
        onDeleted={() => {
          setDetailLeadId(null);
          refresh();
        }}
      />
      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); refresh(); }} />
      <ScheduleCallModal target={callTarget} onClose={() => setCallTarget(null)} onSaved={() => setCallTarget(null)} />
      <CallOutcomeWatcher onLogged={refresh} />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/35 mb-1">{label}</div>
      <div className="font-display text-2xl text-ink">{value}</div>
    </div>
  );
}

function LeadCard({ lead: l, index, onOpen }) {
  const initials = (l.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const dateStr = new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const stale = isStaleLead(l);
  const waNum = waNumberFor(l.phone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 10) * 0.03, ease: EASE }}
      onClick={onOpen}
      className="bg-white rounded-2xl p-4 flex gap-3 cursor-pointer hover:shadow-[0_12px_28px_-16px_rgba(43,21,18,0.15)] transition-all active:scale-[0.99]"
    >
      <div className="w-10 h-10 shrink-0 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center text-xs font-medium">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">
          {l.name} <span className="text-xs font-medium text-ink/35">PC{l.lead_number}</span>
        </div>
        <div className="text-xs text-ink/45 mt-0.5">
          {l.phone}{l.budget ? ` · ${l.budget}` : ""}{l.preferred_location ? ` · ${l.preferred_location}` : ""}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Pill tone="stone">{STATUS_LABELS[l.status] || l.status}</Pill>
          <Pill>{SOURCE_LABELS[l.source] || l.source}</Pill>
          {stale && <Pill tone="yellow">⏰ Stale</Pill>}
          {l.possible_duplicate_of && <Pill tone="red">⚠️ Duplicate</Pill>}
        </div>
        <div className="text-[11px] text-ink/35 mt-2">Last contacted: {timeAgo(l.updated_at || l.created_at)}</div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-[11px] text-ink/35">{dateStr}</div>
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <a href={`tel:${l.phone}`} data-lead-id={l.id} data-lead-name={l.name || ""} className="w-8 h-8 rounded-full bg-ink/[0.04] flex items-center justify-center active:scale-90 transition-transform" title="Call"><Phone className="w-3.5 h-3.5 text-ink/60" /></a>
          <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-ink/[0.04] flex items-center justify-center active:scale-90 transition-transform" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5 text-ink/60" /></a>
        </div>
      </div>
    </motion.div>
  );
}
