import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { todayStr } from "../lib/attendance";
import { waNumberFor } from "../lib/leadConstants";
import { Button } from "../components/ui/button";
import { Pill } from "../components/ui/primitives";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";

const STATUS_TONE = { done: "green", cancelled: "red", no_show: "red" };
const STATUS_LABEL = { done: "✓ Done", cancelled: "Cancelled", no_show: "No Show", scheduled: "Scheduled" };
const EASE = [0.22, 1, 0.36, 1];

export default function Schedule() {
  const { user, isAdmin } = useAuth();
  const showToast = useToast();
  const [filter, setFilter] = useState("upcoming");
  const [visits, setVisits] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);

  async function load() {
    const today = todayStr();
    let q = sb.from("scheduled_visits").select("*").order("visit_date", { ascending: true }).order("visit_time", { ascending: true });
    if (filter === "upcoming") q = q.gte("visit_date", today).in("status", ["scheduled"]);
    else if (filter === "done") q = q.eq("status", "done");
    else if (filter === "cancelled") q = q.in("status", ["cancelled", "no_show"]);
    if (!isAdmin) q = q.eq("created_by", user.id);
    const { data } = await q;
    setVisits(data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function markDone(id) {
    await sb.from("scheduled_visits").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", id);
    showToast("✓ Marked as done!");
    load();
  }
  async function cancel(id) {
    if (!window.confirm("Cancel this visit?")) return;
    await sb.from("scheduled_visits").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    showToast("Visit cancelled.");
    load();
  }

  const today = todayStr();
  const todayVisits = (visits || []).filter((v) => v.visit_date === today && v.status === "scheduled");
  const rest = (visits || []).filter((v) => v.visit_date !== today);

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Site Visits</div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="font-display text-3xl text-ink">Visit Calendar</h1>
        <div className="flex gap-2">
          <select className="field-input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="all">All</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button size="sm" onClick={() => setVisitTarget({ leadId: null, name: "", phone: "" })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Schedule Visit
          </Button>
        </div>
      </div>

      {visits === null ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
      ) : (
        <>
          {todayVisits.length > 0 && (
            <div className="mb-6">
              <div className="text-[11px] font-bold tracking-widest2 uppercase text-stone-500 mb-3">
                Today — {todayVisits.length} visit{todayVisits.length > 1 ? "s" : ""}
              </div>
              <div className="space-y-2.5">
                {todayVisits.map((v) => (
                  <SchedCard key={v.id} visit={v} isToday onDone={markDone} onCancel={cancel} />
                ))}
              </div>
            </div>
          )}

          {rest.length === 0 && todayVisits.length === 0 ? (
            <div className="bg-white rounded-3xl text-center py-16 text-ink/40">
              <div className="font-display text-lg text-ink">No visits found</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rest.map((v) => <SchedCard key={v.id} visit={v} onDone={markDone} onCancel={cancel} />)}
            </div>
          )}
        </>
      )}

      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); load(); }} />
    </div>
  );
}

function SchedCard({ visit: v, isToday, onDone, onCancel }) {
  const d = new Date(v.visit_date + "T00:00:00");
  const day = d.getDate();
  const mon = d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  const waNum = waNumberFor(v.client_phone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="bg-white rounded-3xl p-4 flex gap-3.5 items-center"
    >
      <div className={`text-center shrink-0 rounded-2xl px-3 py-2 min-w-[56px] ${isToday ? "bg-stone-600 text-sand" : "bg-stone-50 text-ink"}`}>
        <div className="font-display text-xl leading-none">{day}</div>
        <div className="text-[10px] font-semibold mt-1">{mon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{v.client_name}{v.client_phone ? ` · ${v.client_phone}` : ""}</div>
        <div className="text-xs text-ink/45 mt-0.5">{v.listing_title || "—"}</div>
        <div className="flex gap-1.5 flex-wrap items-center mt-2">
          <Pill>🕐 {v.visit_time}</Pill>
          {v.status !== "scheduled" && <Pill tone={STATUS_TONE[v.status] || "neutral"}>{STATUS_LABEL[v.status]}</Pill>}
          {v.notes && <span className="text-xs text-ink/40">{v.notes}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 items-end shrink-0">
        {v.client_phone && (
          <div className="flex gap-1.5">
            <a href={`tel:${v.client_phone}`} className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-sm" title="Call">📞</a>
            <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-sm" title="WhatsApp">💬</a>
          </div>
        )}
        {v.status === "scheduled" && (
          <div className="flex gap-1.5">
            <button onClick={() => onDone(v.id)} className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1.5">✓ Done</button>
            <button onClick={() => onCancel(v.id)} className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1.5">Cancel</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
