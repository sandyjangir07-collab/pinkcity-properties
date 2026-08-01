import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { TYPE_LABEL, EMOJI } from "../lib/listingConstants";
import { IconPlus } from "../components/ui/Icons";
import ListingFormModal from "../components/listings/ListingFormModal";

export default function Listings() {
  const { isAdmin } = useAuth();
  const showToast = useToast();
  const [listings, setListings] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // "new" | listingId | null

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
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Listings</h1>
      <p className="page-sub">{isAdmin ? "Review submissions and manage everything that's live." : "Your submitted properties."}</p>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{stats.pending}</div></div>
          <div className="stat-card"><div className="stat-label">Live</div><div className="stat-value">{stats.active}</div></div>
          <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
          <div className="stat-card"><div className="stat-label">Rejected</div><div className="stat-value">{stats.rejected}</div></div>
        </div>
      )}

      <button className="btn btn-primary" style={{ width: "auto", display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }} onClick={() => setFormTarget("new")}>
        <IconPlus size={15} stroke="white" /> Add Listing
      </button>

      {listings === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : listings.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-title">{isAdmin ? "No submissions yet" : "No listings yet"}</div>
          <p>Click Add Listing to submit your first property.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} isAdmin={isAdmin} onEdit={() => setFormTarget(l.id)} onApprove={approve} onReject={reject} onDelete={del} />
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

function ListingCard({ listing: l, isAdmin, onEdit, onApprove, onReject, onDelete }) {
  const imgs = l.images && l.images.length ? l.images : l.image_url ? [l.image_url] : [];
  const badge =
    l.status === "pending" ? { cls: "pill-yellow", text: "◐ Pending" }
    : l.status === "active" ? { cls: "pill-green", text: "● Live" }
    : { cls: "pill-red", text: "✕ Rejected" };
  const date = l.created_at ? new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          height: 140,
          background: imgs.length ? `url(${imgs[0]}) center/cover` : "var(--secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
        }}
      >
        {!imgs.length && (EMOJI[l.type] || "🏠")}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5 }}>{l.title}</div>
          <div style={{ color: "var(--primary)", fontSize: 14, flexShrink: 0 }}>{l.price}</div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 2 }}>
          {[TYPE_LABEL[l.type], l.size, l.area].filter(Boolean).join(" · ")}
          {l.verified ? " · ✓ Verified" : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
          <span className={"pill " + badge.cls}>{badge.text}</span>
          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
            {isAdmin ? `by ${l.submitter_name || "Team"} · ${date}` : date}
          </span>
        </div>
        {isAdmin && l.submitter_phone && (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>📞 {l.submitter_phone}</div>
        )}
        {imgs.length > 1 && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>📷 {imgs.length} photos</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {l.type === "colony" && (
            <Link to="/plots" className="btn btn-secondary" style={{ width: "auto", fontSize: 12, padding: "8px 12px", textDecoration: "none" }}>
              🏘️ Manage Availability
            </Link>
          )}
          {isAdmin && l.status === "pending" && (
            <>
              <button className="btn btn-secondary" style={{ width: "auto", fontSize: 12, padding: "8px 12px" }} onClick={onEdit}>✎ Edit &amp; Verify</button>
              <button className="btn-approve" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => onApprove(l.id)}>✓ Approve</button>
              <button className="btn-reject" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => onReject(l.id)}>✕ Reject</button>
            </>
          )}
          {isAdmin && l.status === "active" && (
            <>
              <button className="btn btn-secondary" style={{ width: "auto", fontSize: 12, padding: "8px 12px" }} onClick={onEdit}>✎ Edit</button>
              <button className="btn-reject" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => onReject(l.id)}>Take offline</button>
            </>
          )}
          {!isAdmin && l.status !== "active" && (
            <button className="btn btn-secondary" style={{ width: "auto", fontSize: 12, padding: "8px 12px" }} onClick={onEdit}>Edit</button>
          )}
          {isAdmin && (
            <button className="btn-reject" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => onDelete(l.id)}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}
