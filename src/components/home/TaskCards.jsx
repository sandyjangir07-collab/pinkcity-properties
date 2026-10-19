import { STATUS_LABELS, waNumberFor, timeAgo } from "../../lib/leadConstants";
import { todayStr } from "../../lib/attendance";
import { Phone, MessageCircle } from "lucide-react";
import { Pill } from "../ui/primitives";

export function FollowupCard({ lead: l, onOpen }) {
  const initials = (l.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const waNum = waNumberFor(l.phone);
  const isOverdue = l.follow_up_date < todayStr();

  return (
    <div onClick={onOpen} className="bg-stone-50/60 rounded-2xl p-3.5 flex gap-3 cursor-pointer">
      <div className="w-9 h-9 rounded-2xl bg-white text-stone-600 flex items-center justify-center text-xs font-medium shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{l.name} <span className="text-xs font-medium text-ink/35">PC{l.lead_number}</span></div>
        <div className="text-xs text-ink/45">{l.phone}{l.preferred_location ? ` · ${l.preferred_location}` : ""}</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Pill tone="stone">{STATUS_LABELS[l.status] || l.status}</Pill>
          {isOverdue && (
            <Pill tone="red">⏰ Overdue since {new Date(l.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Pill>
          )}
        </div>
        <div className="text-[11px] text-ink/35 mt-1.5">Last contacted: {timeAgo(l.updated_at || l.created_at)}</div>
      </div>
      <div className="flex gap-1.5 items-start" onClick={(e) => e.stopPropagation()}>
        <a href={`tel:${l.phone}`} data-lead-id={l.id} data-lead-name={l.name || ""} className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="Call"><Phone className="w-3.5 h-3.5 text-ink/60" /></a>
        <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5 text-ink/60" /></a>
      </div>
    </div>
  );
}

export function VisitCard({ visit: v }) {
  const initials = (v.client_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const waNum = waNumberFor(v.client_phone);
  return (
    <div className="bg-stone-50/60 rounded-2xl p-3.5 flex gap-3">
      <div className="w-9 h-9 rounded-2xl bg-white text-stone-600 flex items-center justify-center text-xs font-medium shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{v.client_name}</div>
        <div className="text-xs text-ink/45">{v.listing_title || ""}{v.visit_time ? ` · ${v.visit_time}` : ""}</div>
      </div>
      <div className="flex gap-1.5 items-start">
        <a href={`tel:${v.client_phone}`} className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="Call"><Phone className="w-3.5 h-3.5 text-ink/60" /></a>
        <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5 text-ink/60" /></a>
      </div>
    </div>
  );
}
