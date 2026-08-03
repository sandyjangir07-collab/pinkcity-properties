import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { TYPE_LABEL, EMOJI } from "../lib/listingConstants";
import { Phone, Building2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Camera } from "lucide-react";
import { Pill, StatCard } from "../components/ui/primitives";
import ListingFormModal from "../components/listings/ListingFormModal";

const EASE = [0.22, 1, 0.36, 1];

export default function Listings() {
  const { isAdmin } = useAuth();
  const showToast = useToast();
  const [listings, setListings] = useState(null);
  const [formTarget, setFormTarget] = useState(null);

  async function load() {
    let q = sb.from("listings").select("*").order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("uid", (await sb.auth.getUser()).data.user.id);
    const { data } = await q;
    setListings(data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const stats = isAdmin && listings
    ? {
        pending: listings.filter((l) => l.status === "pending").length,
        active: listings.filter((l) => l.status === "active").length,
        total: listings.length,
        rejected: listings.filter((l) => l.status === "rejected").length,
      }
    : null;

  async function approve(id) {
    const { error } = await sb.from("listings").update({ status: "active", approved_at: new Date().toISOString() }).eq("id", id);
    if (!error) {
      showToast("✓ Listing is now live!");
      load();
    }
  }
  async function reject(id) {
    const { error } = await sb.from("listings").update({ status: "rejected", rejected_at: new Date().toISOString() }).eq("id", id);
    if (!error) {
      showToast("Listing rejected.");
      load();
    }
  }
  async function del(id) {
    if (!window.confirm("Permanently delete this listing?")) return;
    await sb.from("listings").delete().eq("id", id);
    showToast("Deleted.");
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-3xl text-ink mb-2">Listings</h1>
      <p className="text-ink/50 text-sm mb-8">{isAdmin ? "Review submissions and manage everything that's live." : "Your submitted properties."}</p>

      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Pending" value={stats.pending} tone="brass" />
          <StatCard label="Live" value={stats.active} tone="emerald" />
          <StatCard label="Total" value={stats.total} tone="stone" />
          <StatCard label="Rejected" value={stats.rejected} tone="jali" />
        </div>
      )}

      <Button onClick={() => setFormTarget("new")} className="mb-6">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        Add Listing
      </Button>

      {listings === null ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-3xl text-center py-16 text-ink/40">
          <div className="font-display text-lg text-ink mb-1">{isAdmin ? "No submissions yet" : "No listings yet"}</div>
          <p className="text-sm">Click Add Listing to submit your first property.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l, i) => (
            <ListingCard key={l.id} listing={l} index={i} isAdmin={isAdmin} onEdit={() => setFormTarget(l.id)} onApprove={approve} onReject={reject} onDelete={del} />
          ))}
        </div>
      )}

      <ListingFormModal
        target={formTarget}
        isAdmin={isAdmin}
        onClose={() => setFormTarget(null)}
        onSaved={() => {
          setFormTarget(null);
          load();
        }}
      />
    </div>
  );
}


function ListingCard({ listing: l, index, isAdmin, onEdit, onApprove, onReject, onDelete }) {
  const imgs = l.images && l.images.length ? l.images : l.image_url ? [l.image_url] : [];
  const tone = l.status === "pending" ? "yellow" : l.status === "active" ? "green" : "red";
  const badgeText = l.status === "pending" ? "◐ Pending" : l.status === "active" ? "● Live" : "✕ Rejected";
  const date = l.created_at ? new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: (index % 9) * 0.04, ease: EASE }}
      className="bg-white rounded-3xl overflow-hidden transition-transform"
    >
      <div
        className="h-36 flex items-center justify-center text-4xl bg-stone-50"
        style={imgs.length ? { backgroundImage: `url(${imgs[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {!imgs.length && (EMOJI[l.type] || "🏠")}
      </div>
      <div className="p-4">
        <div className="flex justify-between gap-2">
          <div className="font-medium text-sm text-ink">{l.title}</div>
          <div className="text-stone-600 text-sm shrink-0">{l.price}</div>
        </div>
        <div className="text-xs text-ink/45 mt-1">
          {[TYPE_LABEL[l.type], l.size, l.area].filter(Boolean).join(" · ")}
          {l.verified ? " · ✓ Verified" : ""}
        </div>
        <div className="flex items-center gap-2 flex-wrap my-2.5">
          <Pill tone={tone}>{badgeText}</Pill>
          <span className="text-[11px] text-ink/35">{isAdmin ? `by ${l.submitter_name || "Team"} · ${date}` : date}</span>
        </div>
        {isAdmin && l.submitter_phone && <div className="text-xs text-ink/45 mb-1.5 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {l.submitter_phone}</div>}
        {imgs.length > 1 && <div className="text-[11px] text-ink/35 mb-2 inline-flex items-center gap-1"><Camera className="w-3 h-3" /> {imgs.length} photos</div>}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {l.type === "colony" && (
            <Link to="/plots" className="text-xs font-medium text-stone-600 border border-stone-200 rounded-full px-3 py-1.5 no-underline inline-flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Manage Availability</Link>
          )}
          {isAdmin && l.status === "pending" && (
            <>
              <button onClick={onEdit} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5">✎ Edit &amp; Verify</button>
              <button onClick={() => onApprove(l.id)} className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">✓ Approve</button>
              <button onClick={() => onReject(l.id)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">✕ Reject</button>
            </>
          )}
          {isAdmin && l.status === "active" && (
            <>
              <button onClick={onEdit} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5">✎ Edit</button>
              <button onClick={() => onReject(l.id)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">Take offline</button>
            </>
          )}
          {!isAdmin && l.status !== "active" && (
            <button onClick={onEdit} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5">Edit</button>
          )}
          {isAdmin && <button onClick={() => onDelete(l.id)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">Delete</button>}
        </div>
      </div>
    </motion.div>
  );
}
