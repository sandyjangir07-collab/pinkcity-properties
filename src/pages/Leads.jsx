import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Phone, MessageCircle, Search, Plus, Trash2, Clock, ChevronDown, CheckCheck } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { STATUS_TEXT, SOURCE_LABELS, isStaleLead, timeAgo, waNumberFor } from "../lib/leadConstants";
import { leadScore } from "../lib/leadScore";
import { JOURNEY, journeyStep, isOpenLead, isHot, nextAction, needsFollowUp, buildQueue, tomorrowMorning, visitLabel } from "../lib/leadNext";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";
import { BrandedLoader } from "../components/ui/BrandedLoader";

const EASE = [0.22, 1, 0.36, 1];

// Small label shown on each lead row. Only one is shown; the most important wins.
const TAG_TONE = {
  hot: "bg-[#FCEBF0] text-[#8E1640]",
  dup: "bg-rose-100 text-rose-700",
  admin: "bg-ink text-cream",
  shared: "bg-[#F1EADB] text-[#6B4E12]",
  stale: "bg-[#FBEFD3] text-[#6B4E12]",
  source: "bg-[#E6EEF8] text-[#234A7C]",
};

function leadTag(l, hot) {
  if (l.admin_only) return { text: "Admin only", tone: TAG_TONE.admin };
  if (hot) return { text: "Hot", tone: TAG_TONE.hot };
  if (l.possible_duplicate_of) return { text: "Possible dup", tone: TAG_TONE.dup };
  if (l.assigned_to) return { text: "Shared", tone: TAG_TONE.shared };
  if (isStaleLead(l)) return { text: "Stale", tone: TAG_TONE.stale };
  return { text: SOURCE_LABELS[l.source] || (l.source === "manual" ? "Manual" : "Lead"), tone: TAG_TONE.source };
}

function initialsOf(name) {
  return (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function JourneyBar({ status }) {
  const step = journeyStep(status);
  return (
    <div className="grid grid-cols-5 gap-1" role="img" aria-label={step ? `Stage ${step} of 5, ${JOURNEY[step - 1]}` : "Lost"}>
      {JOURNEY.map((s, i) => (
        <span key={s} className={`h-1 rounded-full ${i < step ? "bg-crimson" : "bg-[#E7DCC8]"}`} />
      ))}
    </div>
  );
}

function snoozeKey(userId) {
  return `pc_leads_snooze_${userId}`;
}
function readSnooze(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(snoozeKey(userId)) || "{}");
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, until]) => until > now));
  } catch {
    return {};
  }
}

export default function Leads() {
  const { user, isAdmin } = useAuth();
  const showToast = useToast();
  const [leads, setLeads] = useState(null);
  const [visits, setVisits] = useState({});
  const [filter, setFilter] = useState("All");
  const [showStages, setShowStages] = useState(false);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedLeads, setDeletedLeads] = useState(null);
  const [snoozed, setSnoozed] = useState(() => readSnooze(user?.id));
  const [heroIdx, setHeroIdx] = useState(0);
  const slideDir = useRef(0); // -1 = came from the right (swiped left), 1 = from the left
  const justDragged = useRef(false);
  const heroControls = useAnimationControls();

  const [formTarget, setFormTarget] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  async function load() {
    let q = sb.from("leads").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (!isAdmin) q = q.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
    const { data } = await q;
    setLeads(data || []);
    // Booked visits, so "Confirm visit" and the visit date can be shown. Failing just hides them.
    const { data: v } = await sb
      .from("scheduled_visits")
      .select("lead_id,visit_date,visit_time,status")
      .eq("status", "scheduled")
      .not("lead_id", "is", null)
      .order("visit_date", { ascending: true });
    const map = {};
    (v || []).forEach((row) => {
      if (!map[row.lead_id]) map[row.lead_id] = row; // soonest first
    });
    setVisits(map);
  }

  async function loadDeleted() {
    const { data } = await sb.from("leads").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    setDeletedLeads(data || []);
  }

  async function restoreLead(id) {
    // Restored leads stay visible to the admin only; the team member who deleted it does not get it back.
    const { error } = await sb.from("leads").update({ deleted_at: null, deleted_by: null, deleted_by_name: null, admin_only: true }).eq("id", id);
    if (error) return showToast(error.message);
    showToast("✓ Lead restored. Only you (admin) can see it.");
    loadDeleted();
    refresh();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (isAdmin && showDeleted) loadDeleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const scored = useMemo(() => (leads || []).map((l) => ({ ...l, _score: leadScore(l) })), [leads]);
  const actions = useMemo(() => {
    const m = {};
    scored.forEach((l) => (m[l.id] = nextAction(l, visits[l.id])));
    return m;
  }, [scored, visits]);

  const counts = useMemo(() => {
    const c = {};
    Object.keys(STATUS_TEXT).forEach((s) => (c[s] = scored.filter((l) => l.status === s).length));
    return c;
  }, [scored]);

  const openCount = scored.filter(isOpenLead).length;
  const hotCount = scored.filter((l) => isHot(l, l._score)).length;
  const followCount = scored.filter((l) => needsFollowUp(actions[l.id])).length;
  const sharedCount = scored.filter((l) => l.assigned_to).length;

  const term = search.trim().toLowerCase();
  const visible = scored.filter((l) => {
    const matchesQ =
      !term ||
      (l.name || "").toLowerCase().includes(term) ||
      (l.phone || "").toLowerCase().includes(term) ||
      (l.preferred_location || "").toLowerCase().includes(term) ||
      ("pc" + l.lead_number).includes(term.replace(/\s/g, ""));
    if (!matchesQ) return false;
    if (filter === "All") return true;
    if (filter === "Hot") return isHot(l, l._score);
    if (filter === "FollowUp") return needsFollowUp(actions[l.id]);
    if (filter === "Shared") return !!l.assigned_to;
    return l.status === filter;
  });

  const queue = useMemo(() => buildQueue(scored, visits, snoozed), [scored, visits, snoozed]);
  const safeIdx = Math.min(heroIdx, Math.max(queue.length - 1, 0));
  const hero = queue[safeIdx];

  const heroId = hero ? hero.lead.id : null;
  useEffect(() => {
    if (!heroId) return;
    heroControls.start({ opacity: [0, 1], x: [slideDir.current * 48, 0], transition: { duration: 0.28, ease: EASE } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId]);

  function goTo(i) {
    if (i < 0 || i >= queue.length || i === safeIdx) return;
    slideDir.current = i > safeIdx ? 1 : -1;
    setHeroIdx(i);
  }
  function onHeroDragEnd(_, info) {
    // The click that ends a swipe can arrive before this handler, so "dragging" is set in onDragStart.
    setTimeout(() => (justDragged.current = false), 150);
    if (info.offset.x < -60 || info.velocity.x < -450) goTo(safeIdx + 1);
    else if (info.offset.x > 60 || info.velocity.x > 450) goTo(safeIdx - 1);
  }

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function snoozeLead(lead) {
    const next = { ...readSnooze(user.id), [lead.id]: tomorrowMorning() };
    try {
      localStorage.setItem(snoozeKey(user.id), JSON.stringify(next));
    } catch {
      /* private mode: still hides it for this visit */
    }
    setSnoozed(next);
    slideDir.current = 1; // the next lead slides in from the right
    showToast(`We'll bring ${lead.name} back tomorrow morning.`);
  }

  function openVisit(l) {
    setVisitTarget({ leadId: l.id, name: l.name, phone: l.phone, editId: null, existing: null });
  }

  const filters = [
    { id: "All", label: "All", n: scored.length },
    { id: "Hot", label: "Hot", n: hotCount },
    { id: "FollowUp", label: "Follow up", n: followCount },
    ...(sharedCount > 0 || filter === "Shared" ? [{ id: "Shared", label: "Shared", n: sharedCount }] : []),
    { id: "new", label: "New", n: counts.new || 0 },
  ];
  const stageFilterActive = Object.keys(STATUS_TEXT).includes(filter) && filter !== "new";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long" });

  return (
    <div className="max-w-2xl mx-auto pb-44 md:pb-28">
      <section className="px-5 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12.5px] font-medium text-ink/55">
              {today} · {openCount} open · {hotCount} hot
            </div>
            <h1 className="mt-1.5 font-display text-[30px] font-medium leading-[1.05] tracking-tight text-ink">What needs you now</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowDeleted((s) => !s)}
              className={`shrink-0 mt-1 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                showDeleted ? "bg-red-50 text-red-600 border border-red-200" : "border border-ink/10 text-ink/50"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {showDeleted ? "Back to leads" : "Deleted"}
            </button>
          )}
        </div>
        {showDeleted && (
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink/50">
            Deleted by your team — restore any of these if they were removed by mistake.
          </p>
        )}
      </section>

      {showDeleted ? (
        <section className="mt-6 px-5">
          {deletedLeads === null ? (
            <div className="flex justify-center py-16"><BrandedLoader size={28} /></div>
          ) : deletedLeads.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-9 text-center">
              <p className="font-display text-[19px] text-ink">Nothing deleted</p>
              <p className="mt-1.5 text-xs text-ink/45">Deleted leads will show up here, recoverable any time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deletedLeads.map((l) => (
                <div key={l.id} className="rounded-[22px] border border-red-100 bg-red-50/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{l.name} <span className="text-[11px] font-medium text-ink/35">PC{l.lead_number}</span></div>
                      <div className="text-[11.5px] text-ink/45 mt-0.5">
                        {l.phone}{l.preferred_location ? ` · ${l.preferred_location}` : ""}
                      </div>
                      <div className="text-[11px] text-red-500 mt-1.5">
                        Deleted by {l.deleted_by_name || "—"} · {timeAgo(l.deleted_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => restoreLead(l.id)}
                      className="shrink-0 rounded-full bg-stone-600 text-sand text-xs font-semibold px-4 py-2.5 active:scale-95 transition-transform"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {leads !== null && !term && (
            <section className="mt-5 px-5">
              {hero ? (
                <motion.div
                  animate={heroControls}
                  drag={queue.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.35}
                  onDragStart={() => (justDragged.current = true)}
                  onDragEnd={onHeroDragEnd}
                  onClickCapture={(e) => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } }}
                  className="relative cursor-grab select-none overflow-hidden rounded-[28px] bg-gradient-to-br from-crimson to-crimson-deep p-[18px] text-cream shadow-[0_24px_40px_-22px_rgba(142,22,64,0.65)]"
                >
                  <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(217,184,118,0.38),rgba(217,184,118,0)_70%)]" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#F2D9A6]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F2D9A6]" />
                      {hero.lead.status === "visit_done" ? "Follow up · visit done" : hero.action.kind === "call" ? "Call next" : "Do next"}
                    </div>
                    {queue.length > 1 && (queue.length <= 6 ? (
                      <div className="flex items-center gap-1.5">
                        {queue.map((q, i) => (
                          <button
                            key={q.lead.id}
                            onClick={() => goTo(i)}
                            aria-label={`Show ${i + 1} of ${queue.length}`}
                            className="flex h-6 items-center"
                          >
                            <span className={`h-1 rounded-full transition-all ${i === safeIdx ? "w-[18px] bg-cream" : "w-1.5 bg-cream/40"}`} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold tabular-nums text-cream/80">{safeIdx + 1} / {queue.length}</div>
                    ))}
                  </div>
                  <button onClick={() => setDetailLeadId(hero.lead.id)} className="relative mt-3 block w-full text-left">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-display text-[27px] font-medium leading-[1.1]">{hero.lead.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-[#F2D9A6]">PC{hero.lead.lead_number}</span>
                    </span>
                    <span className="mt-1 block truncate text-[13px] text-[#F6DCE4]">
                      {[hero.lead.budget && `₹${String(hero.lead.budget).replace(/^₹/, "")}`, hero.lead.preferred_location, `Score ${hero.lead._score}`].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                  <div className="relative mt-3 inline-flex max-w-full items-center gap-2 rounded-xl bg-cream/[0.14] px-3 py-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0">{hero.action.reason}</span>
                  </div>
                  <div className="relative mt-4 flex gap-2">
                    {hero.action.kind === "call" ? (
                      <a
                        href={`tel:${hero.lead.phone}`}
                        data-lead-id={hero.lead.id}
                        data-lead-name={hero.lead.name || ""}
                        className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-cream text-sm font-semibold text-crimson-deep active:scale-[0.98] transition-transform"
                      >
                        <Phone className="h-4 w-4" /> {hero.action.label}
                      </a>
                    ) : (
                      <button
                        onClick={() => (hero.action.kind === "visit" ? openVisit(hero.lead) : setDetailLeadId(hero.lead.id))}
                        className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-cream text-sm font-semibold text-crimson-deep active:scale-[0.98] transition-transform"
                      >
                        {hero.action.label}
                      </button>
                    )}
                    <a
                      href={`https://wa.me/${waNumberFor(hero.lead.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp ${hero.lead.name}`}
                      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-cream/45 bg-cream/[0.12]"
                    >
                      <MessageCircle className="h-[18px] w-[18px]" />
                    </a>
                    <button
                      onClick={() => snoozeLead(hero.lead)}
                      className="h-[46px] shrink-0 rounded-full border border-cream/45 px-4 text-[13px] font-medium"
                    >
                      Later
                    </button>
                  </div>
                </motion.div>
              ) : scored.length > 0 && openCount > 0 ? (
                <div className="flex items-center gap-3.5 rounded-[28px] border border-ink/[0.06] bg-white p-5 shadow-soft">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCheck className="h-5 w-5" /></span>
                  <div>
                    <p className="font-display text-[18px] font-medium text-ink">You're all caught up</p>
                    <p className="mt-0.5 text-[12.5px] text-ink/55">Nothing urgent right now. Snoozed leads return tomorrow morning.</p>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          <section className="mt-5 px-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, locality…"
                className="w-full rounded-2xl border border-[#EADFCB] bg-[#FEFCFA] py-3.5 pl-11 pr-4 text-sm font-medium text-ink outline-none transition-all placeholder:text-ink/40 focus:border-stone-400 focus:ring-4 focus:ring-stone-500/10"
              />
            </div>
          </section>

          <section className="mt-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
              {filters.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                      active ? "bg-ink text-cream" : "border border-[#E0D3BE] bg-[#FEFCFA] text-ink/75"
                    }`}
                  >
                    {f.label} <span className="ml-0.5 opacity-60">{f.n}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowStages((s) => !s)}
                aria-expanded={showStages}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                  stageFilterActive ? "bg-ink text-cream" : "border border-[#E0D3BE] bg-[#FEFCFA] text-ink/75"
                }`}
              >
                {stageFilterActive ? STATUS_TEXT[filter] : "Stage"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showStages ? "rotate-180" : ""}`} />
              </button>
            </div>
            {showStages && (
              <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar px-5 pb-1">
                {Object.keys(STATUS_TEXT).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-semibold transition-all active:scale-95 ${
                      filter === s ? "bg-crimson text-white" : "border border-[#E0D3BE] bg-white text-ink/60"
                    }`}
                  >
                    {STATUS_TEXT[s]} <span className="ml-0.5 opacity-60">{counts[s] || 0}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-4 px-5">
            {leads === null ? (
              <div className="flex justify-center py-16"><BrandedLoader size={28} /></div>
            ) : visible.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-ink/15 bg-white/60 p-9 text-center">
                <img src="/logo.png" alt="" className="w-12 h-12 object-contain mx-auto mb-3 opacity-25" />
                <p className="font-display text-[19px] text-ink">No leads here</p>
                <p className="mt-1.5 text-xs text-ink/45">Try another filter or clear your search.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visible.map((l, i) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    index={i}
                    userId={user.id}
                    action={actions[l.id]}
                    visit={visits[l.id]}
                    onOpen={() => setDetailLeadId(l.id)}
                    onVisit={() => openVisit(l)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 bg-gradient-to-t from-sand from-55% to-transparent px-5 pb-4 pt-8 pointer-events-none md:bottom-0">
        <div className="mx-auto flex max-w-md justify-center">
          <button
            onClick={() => setFormTarget("new")}
            className="pointer-events-auto flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-8 text-sm font-semibold text-cream shadow-[0_14px_28px_-12px_rgba(34,26,23,0.55)] transition-transform active:scale-[0.97]"
          >
            <Plus className="h-[17px] w-[17px]" />
            Add lead
          </button>
        </div>
      </div>

      <LeadFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={() => {
          setFormTarget(null);
          refresh();
        }}
      />
      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onChanged={refresh}
        onOpenLead={(id) => setDetailLeadId(id)}
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

function LeadCard({ lead: l, index, userId, action, visit, onOpen, onVisit }) {
  const hot = isHot(l, l._score);
  const tag = leadTag(l, hot);
  const waNum = waNumberFor(l.phone);
  const step = journeyStep(l.status);
  const withLine = l.assigned_to
    ? l.assigned_to === userId
      ? `from ${(l.created_by_name || "owner").split(" ")[0]}`
      : `with ${(l.assigned_to_name || "colleague").split(" ")[0]}`
    : "";
  const sub = [l.budget && `₹${String(l.budget).replace(/^₹/, "")}`, l.preferred_location, withLine].filter(Boolean).join(" · ");
  const stageText =
    l.status === "lost"
      ? "Lost"
      : l.status === "visit_scheduled" && visit
      ? `${step} of 5 · Visit ${visitLabel(visit)}`
      : `${step} of 5 · ${STATUS_TEXT[l.status] || l.status}${l.status === "contacted" || l.status === "new" ? ` ${timeAgo(l.updated_at || l.created_at).toLowerCase()}` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 10) * 0.03, ease: EASE }}
      onClick={onOpen}
      className="cursor-pointer rounded-[22px] border border-[#EADFCB] bg-[#FEFCFA] px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.985]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[15.5px] font-semibold text-ink">{l.name}</span>
            <span className="shrink-0 text-[11px] font-semibold text-[#8A6620]">PC{l.lead_number}</span>
          </div>
          <div className="mt-0.5 truncate text-xs text-ink/55">{sub || l.phone}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-[10px] px-2.5 py-[3px] text-[10.5px] font-semibold uppercase tracking-[0.06em] ${tag.tone}`}>{tag.text}</span>
          <span
            className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-semibold ${hot ? "bg-[#FCEBF0] text-crimson" : "bg-[#F1EADB] text-ink"}`}
            aria-label={`Lead score ${l._score}`}
          >
            {l._score}
          </span>
        </div>
      </div>

      <div className="mt-3"><JourneyBar status={l.status} /></div>

      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 flex-1 truncate text-[11px] text-ink/55">{stageText}</span>
        <a
          href={`tel:${l.phone}`}
          data-lead-id={l.id}
          data-lead-name={l.name || ""}
          aria-label={`Call ${l.name}`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
        <a
          href={`https://wa.me/${waNum}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${l.name}`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-jali-50 text-jali"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
        {action && action.kind === "call" && (
          <a
            href={`tel:${l.phone}`}
            data-lead-id={l.id}
            data-lead-name={l.name || ""}
            className="shrink-0 pl-1 text-xs font-semibold text-crimson"
          >
            {action.label} →
          </a>
        )}
        {action && action.kind === "visit" && (
          <button onClick={onVisit} className="shrink-0 pl-1 text-xs font-semibold text-crimson">{action.label} →</button>
        )}
        {action && action.kind === "open" && (
          <button onClick={onOpen} className="shrink-0 pl-1 text-xs font-semibold text-crimson">{action.label} →</button>
        )}
      </div>
    </motion.div>
  );
}
