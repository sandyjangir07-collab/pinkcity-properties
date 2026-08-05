import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Search, Sparkles, Flame, TrendingUp, Plus } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { STATUS_TEXT, SOURCE_LABELS, STATUS_DOT, isStaleLead, timeAgo, waNumberFor } from "../lib/leadConstants";
import { leadScore } from "../lib/leadScore";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";
import { BrandedLoader } from "../components/ui/BrandedLoader";

const CRM_ADMIN_EMAIL = "sandyjangir07@gmail.com";
const EASE = [0.22, 1, 0.36, 1];

// Status → tone (border/background family), matching each stage to a distinct color
const STATUS_TONE = {
  new: { solid: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  contacted: { solid: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  visit_scheduled: { solid: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  visit_done: { solid: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  negotiating: { solid: "bg-red-100 text-red-700", dot: "bg-red-500" },
  closed: { solid: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  lost: { solid: "bg-ink/[0.08] text-ink/50", dot: "bg-ink/40" },
};

function ScoreRing({ score }) {
  return (
    <span
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#C43868 ${score * 3.6}deg, rgba(34,26,23,0.08) 0deg)` }}
      aria-label={`Lead score ${score}`}
    >
      <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white font-display text-[10.5px] font-semibold text-ink">
        {score}
      </span>
    </span>
  );
}

export default function Leads() {
  const { user } = useAuth();
  const isAdmin = user?.email === CRM_ADMIN_EMAIL;
  const [leads, setLeads] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formTarget, setFormTarget] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  async function load() {
    let q = sb.from("leads").select("*").order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("created_by", user.id);
    const { data } = await q;
    setLeads(data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const scored = useMemo(() => (leads || []).map((l) => ({ ...l, _score: leadScore(l) })), [leads]);

  const counts = useMemo(() => {
    const c = {};
    Object.keys(STATUS_TEXT).forEach((s) => (c[s] = scored.filter((l) => l.status === s).length));
    return c;
  }, [scored]);

  const term = search.trim().toLowerCase();
  const visible = scored.filter((l) => {
    const matchesQ =
      !term ||
      (l.name || "").toLowerCase().includes(term) ||
      (l.phone || "").toLowerCase().includes(term) ||
      (l.preferred_location || "").toLowerCase().includes(term) ||
      ("pc" + l.lead_number).includes(term.replace(/\s/g, ""));
    return matchesQ && (filter === "All" || l.status === filter);
  });

  const hot = scored.filter((l) => l._score >= 70).length;

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="max-w-2xl mx-auto pb-28">
      <section className="px-5 pt-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Sales CRM</div>
        <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.03] tracking-tight text-ink">Leads Pipeline</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink/50">Every enquiry, its next action and who owns it — at a glance.</p>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3 px-5">
        {[
          { n: String(scored.length), label: "Open leads", Icon: Sparkles, wrap: "bg-stone-50 border-stone-200", num: "text-stone-600", lbl: "text-stone-600/70" },
          { n: String(hot), label: "Hot", Icon: Flame, wrap: "bg-brass/10 border-brass/30", num: "text-ink", lbl: "text-ink/50" },
          { n: String(counts.closed || 0), label: "Closed", Icon: TrendingUp, wrap: "bg-emerald-50 border-emerald-200", num: "text-emerald-700", lbl: "text-emerald-700/75" },
        ].map((s) => (
          <div key={s.label} className={`rounded-[24px] border p-4 ${s.wrap}`}>
            <s.Icon className={`h-[18px] w-[18px] opacity-70 ${s.num}`} />
            <div className={`mt-3 font-display text-[22px] font-semibold leading-none ${s.num}`}>{s.n}</div>
            <div className={`mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] ${s.lbl}`}>{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, locality…"
            className="w-full rounded-2xl border border-ink/10 bg-white py-4 pl-11 pr-4 text-sm font-medium text-ink shadow-soft outline-none transition-all placeholder:text-ink/35 focus:border-stone-400 focus:ring-4 focus:ring-stone-500/10"
          />
        </div>
      </section>

      <section className="mt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
          {["All", ...Object.keys(STATUS_TEXT)].map((s) => {
            const active = filter === s;
            const tone = s === "All" ? null : STATUS_TONE[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                  active ? (tone ? `${tone.solid} shadow-soft` : "bg-stone-600 text-sand shadow-lift") : "border border-ink/10 bg-white text-ink/50 shadow-soft"
                }`}
              >
                {s === "All" ? "All" : STATUS_TEXT[s]}
                {s !== "All" && <span className="ml-1.5 opacity-70">{counts[s] || 0}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 px-5">
        {leads === null ? (
          <div className="flex justify-center py-16"><BrandedLoader size={28} /></div>
        ) : visible.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-9 text-center">
            <img src="/logo.png" alt="" className="w-12 h-12 object-contain mx-auto mb-3 opacity-25" />
            <p className="font-display text-lg text-ink">No leads here</p>
            <p className="mt-1.5 text-xs text-ink/45">Try another stage or clear your search.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {visible.map((l, i) => (
              <LeadCard key={l.id} lead={l} index={i} onOpen={() => setDetailLeadId(l.id)} />
            ))}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[0.06] bg-sand/95 backdrop-blur px-5 py-4">
        <div className="mx-auto max-w-md flex items-center gap-3">
          <button
            onClick={() => setFormTarget("new")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-stone-600 py-4 text-sm font-semibold text-sand shadow-lift transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add lead
          </button>
        </div>
      </div>

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

function LeadCard({ lead: l, index, onOpen }) {
  const initials = (l.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const stale = isStaleLead(l);
  const waNum = waNumberFor(l.phone);
  const tone = STATUS_TONE[l.status] || STATUS_TONE.new;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 10) * 0.03, ease: EASE }}
      onClick={onOpen}
      className="group relative overflow-hidden rounded-[26px] border border-ink/[0.06] bg-white p-4 shadow-soft transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.985]"
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[5px] ${tone.dot}`} />
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 pl-1.5">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-50 font-display text-sm font-semibold text-stone-600 ring-2 ring-stone-500/10">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[15px] font-semibold text-ink">{l.name}</span>
            <span className="shrink-0 text-[11px] font-bold tracking-wide text-stone-600">PC{l.lead_number}</span>
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] font-medium text-ink/45">
            {l.phone}{l.budget ? ` · ${l.budget}` : ""}{l.preferred_location ? ` · ${l.preferred_location}` : ""}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] ${tone.solid}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {STATUS_TEXT[l.status] || l.status}
            </span>
            <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink/50">
              {SOURCE_LABELS[l.source] || l.source}
            </span>
            {stale && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-amber-700">Stale</span>}
          </span>
          <span className="mt-2 block text-[11px] text-ink/35">
            Last contacted: <span className="font-semibold text-ink/60">{timeAgo(l.updated_at || l.created_at)}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <ScoreRing score={l._score} />
          <span className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <a href={`tel:${l.phone}`} data-lead-id={l.id} data-lead-name={l.name || ""} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" title="Call">
              <Phone className="h-[15px] w-[15px]" />
            </a>
            <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-jali-50 text-jali" title="WhatsApp">
              <MessageCircle className="h-[15px] w-[15px]" />
            </a>
          </span>
        </span>
      </div>
    </motion.div>
  );
}
