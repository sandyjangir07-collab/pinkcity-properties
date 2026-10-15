import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../lib/utils";
import { Sheet, SheetHeader } from "../ui/Sheet";

// Admin: corrections and availability updates the team has asked for.
export default function RequestsInbox({ open, onClose, onChanged }) {
  const { profile, user } = useAuth();
  const showToast = useToast();
  const [rows, setRows] = useState(null);

  async function load() {
    const { data, error } = await sb
      .from("resale_plot_requests")
      .select("id,plot_id,kind,message,requested_by_name,created_at,resale_plots(scheme,plot_number)")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (error) {
      showToast(error.message);
      setRows([]);
      return;
    }
    setRows(data || []);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function done(id) {
    const { error } = await sb
      .from("resale_plot_requests")
      .update({ status: "done", resolved_at: new Date().toISOString(), resolved_by_name: profile?.full_name || profile?.email || user?.email || "Admin" })
      .eq("id", id);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("✓ Marked done.");
    await load();
    onChanged();
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Requests from the team" sub="Corrections and availability updates" />
      {rows === null && <div className="py-6 text-center text-[13px] text-ink/40">Loading…</div>}
      {rows && rows.length === 0 && <div className="py-8 text-center text-[13.5px] text-ink/45">No open requests. All caught up.</div>}
      <div className="space-y-3">
        {(rows || []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-ink/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/resale/${r.plot_id}`} onClick={onClose} className="text-[14px] font-semibold text-stone-700 underline-offset-2 hover:underline">
                {r.resale_plots ? `${r.resale_plots.scheme} · Plot ${r.resale_plots.plot_number}` : "Listing"}
              </Link>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${r.kind === "availability" ? "bg-amber-100 text-amber-800" : "bg-stone-50 text-stone-700"}`}>
                {r.kind === "availability" ? "Availability" : "Correction"}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink/75">{r.message}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-ink/40">{r.requested_by_name || "Team member"} · {formatDate(r.created_at)}</span>
              <button onClick={() => done(r.id)} className="min-h-[40px] rounded-full bg-emerald-600 px-4 text-[12.5px] font-semibold text-white active:scale-95">
                Mark done
              </button>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
