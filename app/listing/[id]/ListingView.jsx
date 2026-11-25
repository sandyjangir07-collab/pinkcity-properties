"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sb } from "../../../lib/supabase";
import { TYPE_LABEL, EMOJI } from "../../../lib/propertyConstants";
import { amenityIcon } from "../../../lib/amenityIcons";
import { Button } from "../../../components/ui/button";

const TIME_SLOTS = ["9–11 AM", "11 AM–1 PM", "2–4 PM", "4–6 PM"];
const EASE = [0.22, 1, 0.36, 1];
const STATUS_STYLE = {
  available: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  token: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  sold: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
};
const STATUS_LABEL = { available: "Available", token: "Token Received", sold: "Sold" };

function formatPriceHTML(text) {
  if (!text) return "—";
  return String(text).replace(/^\s*starting\s*/i, "").trim();
}

// Derives ₹/Gaj from the free-text price + plot size — only shown when both
// are real, parseable numbers, never a guessed or invented figure.
function parsePriceToRupees(str) {
  if (!str) return null;
  const s = str.replace(/[₹,\s]/g, "").toLowerCase();
  let m = s.match(/([\d.]+)\s*cr/);
  if (m) return parseFloat(m[1]) * 10000000;
  m = s.match(/([\d.]+)\s*l(akh)?/);
  if (m) return parseFloat(m[1]) * 100000;
  m = s.match(/^(\d{5,})$/);
  if (m) return parseFloat(m[1]);
  return null;
}
function fINRShort(n) {
  n = Math.round(n);
  const s = Math.abs(n).toString();
  if (s.length <= 3) return "₹" + s;
  const l3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return "₹" + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + l3;
}

export default function ListingView({ data }) {
  const [galIndex, setGalIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [availOpen, setAvailOpen] = useState(false);
  const [units, setUnits] = useState(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitSent, setVisitSent] = useState(false);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);
  const [form, setForm] = useState({ name: "", phone: "", date: new Date().toISOString().slice(0, 10), msg: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isColony = data?.type === "colony";
  const priceRupees = data ? parsePriceToRupees(data.price) : null;
  const avgRatePerGaj = priceRupees && data?.plot_size ? priceRupees / Number(data.plot_size) : null;

  useEffect(() => {
    if (!isColony || !data?.id) return;
    sb.from("colony_units").select("*").eq("listing_id", data.id).order("created_at", { ascending: true }).then(({ data: u }) => setUnits(u || []));
  }, [isColony, data?.id]);

  if (!data) {
    return (
      <div className="pt-40 pb-32 text-center">
        <div className="font-display text-3xl text-ink mb-3">Listing not found</div>
        <p className="text-ink/50">This property may no longer be available, or hasn&apos;t been approved yet.</p>
      </div>
    );
  }

  const images = data.images && data.images.length ? data.images : data.image_url ? [data.image_url] : [];

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submitVisit() {
    if (!form.name.trim() || !form.phone.trim() || !form.date) {
      setErr("Please fill in name, phone and date.");
      return;
    }
    setBusy(true);
    setErr("");
    const prop = `${data.title} (${data.price}) — ${data.area}`;
    const dateStr = new Date(form.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    try {
      try {
        await sb.from("leads").insert({
          name: form.name.trim(),
          phone: form.phone.trim(),
          source: "visit_form",
          status: "visit_scheduled",
          preferred_location: data.area,
          notes: `Visit requested: ${dateStr}, ${selectedTime}${form.msg ? " — " + form.msg : ""}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error("Lead CRM save:", e);
      }
      const waMsg = `*Site Visit Request — PinkCity*\n\nName: ${form.name}\nPhone: ${form.phone}\nProperty: ${prop}\nDate: ${dateStr}\nTime: ${selectedTime}${form.msg ? "\nMessage: " + form.msg : ""}`;
      setTimeout(() => window.open(`https://wa.me/919358830405?text=${encodeURIComponent(waMsg)}`, "_blank"), 600);
      setVisitSent(true);
    } catch (e) {
      setErr("Something went wrong. Please WhatsApp us directly.");
    } finally {
      setBusy(false);
    }
  }

  function closeVisit() {
    setVisitOpen(false);
    setVisitSent(false);
    setErr("");
  }

  const waHref = `https://wa.me/919358830405?text=${encodeURIComponent(`Hi, I am interested in: ${data.title} (${data.price}) in ${data.area || ""}`)}`;
  const documents = [
    data.location_map_url && { name: "Site Map", url: data.location_map_url, meta: "PDF" },
    data.project_map_url && { name: "Project Layout", url: data.project_map_url, meta: "Image" },
  ].filter(Boolean);

  return (
    <div className="pt-16">
      {/* Gallery */}
      <div className="relative h-[46vh] sm:h-[58vh] bg-stone-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {images.length ? (
            <motion.img
              key={galIndex}
              src={images[galIndex]}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">{EMOJI[data.type] || "🏠"}</div>
          )}
        </AnimatePresence>
        {images.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="" className="absolute bottom-5 right-6 w-9 h-9 object-contain opacity-40 pointer-events-none z-10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />

        <div className="absolute top-5 inset-x-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-ink/75">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
              {TYPE_LABEL[data.type] || data.type}
            </span>
            {data.verified && (
              <a href="/verified" className="inline-flex items-center gap-1.5 rounded-full bg-stone-600 text-sand pl-1.5 pr-3 py-1.5 text-xs font-medium">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="w-4 h-4 object-contain" />
                PinkCity Verified™
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.share ? navigator.share({ title: data.title, url: window.location.href }) : navigator.clipboard.writeText(window.location.href)}
              aria-label="Share"
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#221A17" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            </button>
            <button
              onClick={() => setSaved((s) => !s)}
              aria-label="Save"
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "#C43868" : "none"} stroke={saved ? "#C43868" : "#221A17"} strokeWidth="2">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
              </svg>
            </button>
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button onClick={() => setGalIndex((i) => Math.max(0, i - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button onClick={() => setGalIndex((i) => Math.min(images.length - 1, i + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setGalIndex(i)} className={`h-1.5 rounded-full transition-all ${i === galIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="bg-sand-deep/30 py-3">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-6">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setGalIndex(i)}
                className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === galIndex ? "border-stone-500" : "border-transparent opacity-70"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 pb-40">
        {/* Title card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="-mt-4 relative bg-white rounded-3xl shadow-[0_20px_50px_-24px_rgba(43,21,18,0.18)] p-7">
          <h1 className="font-sans font-bold text-2xl sm:text-3xl text-ink leading-tight">{data.title}</h1>
          <div className="flex items-center gap-4 flex-wrap mt-2.5 text-sm text-ink/60">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {data.area}, Jaipur
            </span>
            {data.rera_approved && (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-5" /></svg>
                RERA Approved
              </span>
            )}
          </div>

          <div className="font-sans font-bold text-2xl sm:text-3xl text-ink mt-4">{formatPriceHTML(data.price)}</div>
          {avgRatePerGaj && <div className="text-sm text-ink/50 mt-1">Avg. Rate: {fINRShort(avgRatePerGaj)} per Gaj</div>}

          <div className="grid grid-cols-3 gap-2.5 mt-5">
            <a href="tel:+919358830405" className="flex items-center justify-center gap-1.5 rounded-xl bg-stone-600 text-sand text-sm font-semibold py-3 active:scale-95 transition-transform">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              Contact
            </a>
            <button onClick={() => setSaved((s) => !s)} className="flex items-center justify-center gap-1.5 rounded-xl border border-ink/15 text-ink text-sm font-medium py-3 active:scale-95 transition-transform">
              <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "#C43868" : "none"} stroke={saved ? "#C43868" : "currentColor"} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
              {saved ? "Saved" : "Shortlist"}
            </button>
            <a href="#location-map" className="flex items-center justify-center gap-1.5 rounded-xl border border-ink/15 text-ink text-sm font-medium py-3 active:scale-95 transition-transform">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              Map
            </a>
          </div>

          {(data.plot_size || data.total_project_area || data.no_of_units) && (
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-ink/[0.06] text-center">
              {data.plot_size && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink/35 mb-1">Size starts at</div>
                  <div className="text-sm font-semibold text-ink">{data.plot_size} {data.plot_size_unit || "Gaj"}</div>
                </div>
              )}
              {data.total_project_area && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink/35 mb-1">Project Size</div>
                  <div className="text-sm font-semibold text-ink">{data.total_project_area}</div>
                </div>
              )}
              {data.no_of_units && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-ink/35 mb-1">No. of Plots</div>
                  <div className="text-sm font-semibold text-ink">{data.no_of_units}</div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Quick facts grid — same colored-icon pattern, using the real fields we have */}
        <Section>
          <div className="bg-white rounded-3xl divide-y divide-ink/[0.06]">
            <div className="grid grid-cols-2">
              <FactRow icon="🏛️" iconBg="bg-violet-100" label="Project Type" value={TYPE_LABEL[data.type] || data.type} />
              <FactRow icon="✅" iconBg="bg-blue-100" label="Approval" value={data.approval_type} />
            </div>
            <div className="grid grid-cols-2 border-t border-ink/[0.06]">
              <FactRow icon="🚩" iconBg="bg-red-100" label="Corner Plot" value={data.corner_plot ? "Yes" : null} />
              <FactRow icon="🌳" iconBg="bg-emerald-100" label="Park Facing" value={data.park_facing ? "Yes" : null} />
            </div>
            <div className="grid grid-cols-2 border-t border-ink/[0.06]">
              <FactRow icon="🧭" iconBg="bg-amber-100" label="Facing" value={!isColony ? data.facing : null} />
              <FactRow icon="🛣️" iconBg="bg-pink-100" label="Road Width" value={!isColony ? data.road_width : null} />
            </div>
          </div>
        </Section>

        {/* Availability grid (colony listings only) */}
        {isColony && (
          <Section>
            <button
              onClick={() => setAvailOpen((o) => !o)}
              className="w-full flex items-center justify-between bg-white rounded-3xl px-6 py-5"
            >
              <span className="flex items-center gap-2.5">
                <span className="font-display text-lg text-ink">Availability</span>
                {units && units.length > 0 && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
                    {units.filter((u) => u.status === "available").length} available
                  </span>
                )}
              </span>
              <motion.svg
                animate={{ rotate: availOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/40 shrink-0"
              >
                <path d="m6 9 6 6 6-6" />
              </motion.svg>
            </button>
            <AnimatePresence initial={false}>
              {availOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    {units === null ? (
                      <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
                    ) : units.length === 0 ? (
                      <div className="bg-white rounded-3xl p-6 text-sm text-ink/40 text-center">Plot-level availability isn&apos;t listed yet for this project — contact us for current inventory.</div>
                    ) : (
                      <>
                        <div className="bg-white rounded-3xl p-5">
                          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                            {units.map((u) => {
                              const s = STATUS_STYLE[u.status] || STATUS_STYLE.available;
                              return (
                                <div key={u.id} title={STATUS_LABEL[u.status] || u.status} className={`rounded-lg border ${s.bg} ${s.border} ${s.text} p-2 text-center`}>
                                  <div className="text-[11px] font-bold">{u.unit_number || "—"}</div>
                                  {u.unit_size && <div className="text-[9px] opacity-75 mt-0.5">{u.unit_size}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 px-1 text-xs text-ink/45">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Available</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Token Received</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Sold</span>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Section>
        )}

        {/* Project overview */}
        <Section title="Project Overview">
          <div className="bg-white rounded-3xl divide-y divide-ink/[0.06]">
            <Row label="Plot Size" value={!isColony && data.plot_size ? `${data.plot_size} ${data.plot_size_unit || "Gaj"}` : null} />
            <Row label="Dimensions" value={!isColony && data.plot_length && data.plot_width ? `${data.plot_length} × ${data.plot_width} Ft` : null} />
            <Row label="Road Width" value={!isColony ? data.road_width : null} />
            <Row label="Facing" value={!isColony ? data.facing : null} />
            <Row label="Approval" value={data.approval_type} />
            <Row label="Agreement Value" value={!isColony ? data.agreement_value : null} />
            <Row label="Total Units" value={isColony ? data.no_of_units : null} />
            <Row label="Project Area" value={isColony ? data.total_project_area : null} />
            <Row label="Internal Roads" value={isColony ? data.colony_road_type : null} />
            <Row label="Approach Road" value={isColony ? data.approach_road : null} last />
          </div>
          {(data.corner_plot || data.park_facing || data.rera_approved) && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {data.corner_plot && <Chip>Corner Plot</Chip>}
              {data.park_facing && <Chip>Park Facing</Chip>}
              {data.rera_approved && <Chip>RERA Approved</Chip>}
            </div>
          )}
        </Section>

        {data.verified && (
          <Section title="PinkCity Verified™">
            <div className="bg-white rounded-3xl p-6 space-y-3.5">
              {["Ownership Verified", "Site Personally Inspected", "Legal Documents Checked", "Connectivity Verified", "Market Value Reviewed"].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 4 4L19 7" /></svg>
                  </span>
                  <span className="text-sm text-ink/75">{t}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.highlights && (
          <Section title="Highlights">
            <div className="bg-white rounded-3xl p-6">
              <ul className="space-y-3">
                {data.highlights.split(",").map((s) => s.trim()).filter(Boolean).map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm text-ink/75 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-500 mt-2 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        <Section title="About this property">
          <div className="bg-white rounded-3xl p-6">
            <p className="text-ink/65 leading-relaxed">{data.desc || data.description || "Contact us for full property details."}</p>
          </div>
        </Section>

        {data.amenities && (
          <Section title="Amenities">
            <div className="bg-white rounded-3xl divide-y divide-ink/[0.06]">
              {data.amenities.split(",").map((s) => s.trim()).filter(Boolean).map((name) => {
                const { icon, bg } = amenityIcon(name);
                return (
                  <div key={name} className="flex items-center gap-3 px-5 py-4">
                    <span className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-[16px] shrink-0`}>{icon}</span>
                    <span className="text-sm font-medium text-ink">{name}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {documents.length > 0 && (
          <Section title="Project Documents">
            <div className="space-y-3">
              {documents.map((d) => (
                <a key={d.name} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white rounded-3xl p-4 hover:shadow-soft hover:-translate-y-0.5 transition-all">
                  <span className="w-11 h-11 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{d.name}</div>
                    <div className="text-xs text-ink/40">{d.meta}</div>
                  </div>
                  <span className="w-10 h-10 rounded-full border border-ink/[0.08] flex items-center justify-center shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                  </span>
                </a>
              ))}
            </div>
          </Section>
        )}

        {data.nearby_landmarks && (
          <Section title="Nearby Landmarks">
            <div className="bg-white rounded-3xl divide-y divide-ink/[0.06]">
              {data.nearby_landmarks.split(",").map((s) => s.trim()).filter(Boolean).map((item) => {
                const [name, value] = item.split(" - ").map((s) => s?.trim());
                return <Row key={item} label={name} value={value || "—"} icon />;
              })}
            </div>
          </Section>
        )}

        {data.latitude && data.longitude && (
          <Section title="Location" id="location-map">
            <div className="rounded-3xl overflow-hidden bg-white">
              <div className="h-52 bg-stone-100">
                <iframe
                  title="Map"
                  className="w-full h-full border-0"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.longitude - 0.01}%2C${data.latitude - 0.01}%2C${Number(data.longitude) + 0.01}%2C${Number(data.latitude) + 0.01}&layer=mapnik&marker=${data.latitude}%2C${data.longitude}`}
                />
              </div>
              <div className="p-5">
                <div className="text-sm font-medium text-ink mb-3">{data.area || data.title}</div>
                <Button as="a" href={`https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}`} target="_blank" rel="noreferrer" className="w-full">
                  Get directions
                </Button>
              </div>
            </div>
          </Section>
        )}

        <Section title="Listed By">
          <div className="bg-white rounded-3xl p-6 flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-stone-600 flex items-center justify-center p-2.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-full h-full object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">PinkCity Properties</div>
              <div className="text-xs text-ink/45 mt-0.5">Verified listing agent · Jaipur</div>
            </div>
            <a
              href="tel:+919358830405"
              className="text-xs font-semibold text-stone-600 border border-stone-200 rounded-full px-4 py-2.5 shrink-0"
            >
              Call
            </a>
          </div>
          <a
            href="https://team.pinkcityproperties.com/listings"
            target="_blank"
            rel="noreferrer"
            className="block text-center text-[11px] text-ink/30 hover:text-ink/50 transition-colors mt-2.5"
          >
            Team member? Manage this listing in the CRM →
          </a>
        </Section>

        {data.verified && (
          <Section>
            <div className="rounded-3xl bg-ink p-7 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-10 h-10 object-contain shrink-0" />
              <div>
                <div className="text-sm font-medium text-sand mb-1">PinkCity Verified™</div>
                <div className="text-xs text-sand/45 leading-relaxed">
                  This property passed our 6-point legal verification — title search, encumbrance, zoning, site check, NOC and senior legal sign-off.
                </div>
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-t border-ink/[0.06] p-4">
        <div className="mx-auto max-w-3xl flex gap-3">
          <Button onClick={() => setVisitOpen(true)} className="flex-1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            Schedule Site Visit
          </Button>
          <a href={waHref} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center shrink-0 active:scale-90 transition-transform" aria-label="WhatsApp">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413" /></svg>
          </a>
        </div>
      </div>

      {/* Visit request modal */}
      <AnimatePresence>
        {visitOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && closeVisit()}
            className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="w-full sm:max-w-md bg-sand rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto mt-3 sm:hidden" />
              {!visitSent ? (
                <div className="p-7">
                  <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C43868" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9,22 9,12 15,12 15,22" /></svg>
                  </div>
                  <h3 className="font-display text-2xl text-ink mb-1.5">Request a site visit</h3>
                  <p className="text-sm text-ink/50 mb-6">We&apos;ll confirm your appointment within 2 hours.</p>

                  <div className="space-y-4">
                    <Field label="Your Name *"><input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Verma" /></Field>
                    <Field label="Phone *"><input className="field-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98XXX XXXXX" /></Field>
                    <Field label="Preferred Date *"><input className="field-input" type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
                    <Field label="Preferred Time">
                      <div className="grid grid-cols-2 gap-2">
                        {TIME_SLOTS.map((slot) => (
                          <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`rounded-xl py-2.5 text-xs font-medium border transition-colors ${selectedTime === slot ? "bg-stone-600 text-sand border-stone-600" : "border-ink/10 text-ink/60"}`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Message (optional)"><textarea className="field-input min-h-[80px]" value={form.msg} onChange={(e) => set("msg", e.target.value)} placeholder="Any specific questions…" /></Field>
                    {err && <p className="text-sm text-red-600 text-center">{err}</p>}
                    <div className="flex gap-3 pt-1">
                      <button onClick={closeVisit} className="flex-1 rounded-full border border-ink/15 text-ink/60 text-sm font-medium py-3">Cancel</button>
                      <Button onClick={submitVisit} disabled={busy} className="flex-1">{busy ? "Sending…" : "Confirm request →"}</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="font-display text-2xl text-ink mb-2">Request sent!</h3>
                  <p className="text-sm text-ink/50 mb-6">
                    We&apos;ve received your visit request for <strong className="text-ink">{new Date(form.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}, {selectedTime}</strong>. We&apos;ll confirm via WhatsApp shortly.
                  </p>
                  <Button onClick={closeVisit}>Done</Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, id, children }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mt-8 scroll-mt-24"
    >
      {title && (
        <div className="mb-4">
          <div className="font-display text-lg text-ink mb-1.5">{title}</div>
          <div className="w-8 h-[3px] rounded-full bg-stone-500" />
        </div>
      )}
      {children}
    </motion.div>
  );
}

function Row({ label, value, icon, last }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm text-ink/50 flex items-center gap-2">
        {icon && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink/30">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
          </svg>
        )}
        {label}
      </span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

function FactRow({ icon, iconBg, label, value }) {
  if (!value) return <div />;
  return (
    <div className="flex items-center gap-2.5 px-5 py-4 min-w-0">
      <span className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center text-[14px] shrink-0`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wide text-ink/40">{label}</span>
        <span className="block text-sm font-semibold text-ink truncate">{value}</span>
      </span>
    </div>
  );
}

function Chip({ children, muted }) {
  return (
    <span className={`shrink-0 text-xs rounded-full px-3 py-1.5 ${muted ? "bg-white text-ink/60" : "bg-stone-50 text-stone-600"}`}>{children}</span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
