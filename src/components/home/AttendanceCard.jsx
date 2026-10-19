import { useEffect, useState } from "react";
import { MapPin, Clock3 } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { todayStr, fmtTime, fmtHours, getLocation } from "../../lib/attendance";

// Check in / check out, right on Home (moved here from the Today page unchanged).
export default function AttendanceCard() {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [attendance, setAttendance] = useState(undefined);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await sb.from("attendance").select("*").eq("user_id", user.id).eq("date", todayStr()).maybeSingle();
    setAttendance(data || null);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act() {
    setBusy(true);
    try {
      const coords = await getLocation();
      const name = profile?.full_name || profile?.email || user.email;
      if (!attendance) {
        const { error } = await sb.from("attendance").insert({
          user_id: user.id, user_name: name, check_in_at: new Date().toISOString(),
          check_in_lat: coords.latitude, check_in_lng: coords.longitude,
        });
        if (error) throw error;
        showToast("✓ Checked in!");
      } else {
        const { error } = await sb.from("attendance").update({ check_out_at: new Date().toISOString(), check_out_lat: coords.latitude, check_out_lng: coords.longitude }).eq("id", attendance.id);
        if (error) throw error;
        showToast("✓ Checked out!");
      }
      await load();
    } catch (e) {
      showToast(
        e.message && e.message.includes("meters from the office")
          ? `You're too far from the office to check in. ${e.message}`
          : e.message || "Something went wrong — please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  const status =
    attendance === undefined ? "…"
    : !attendance ? "Not checked in yet"
    : !attendance.check_out_at ? `Checked in at ${fmtTime(attendance.check_in_at)}`
    : `✓ ${fmtTime(attendance.check_in_at)} – ${fmtTime(attendance.check_out_at)} · ${fmtHours(attendance.check_in_at, attendance.check_out_at)}`;
  const label = !attendance ? "Check In" : !attendance.check_out_at ? "Check Out" : "Done for today";
  const done = !!(attendance && attendance.check_out_at);

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-stone-700/20 bg-stone-600 p-5 shadow-lift">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brass/40 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sand/60">Attendance</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold text-sand">
            <Clock3 className="w-4 h-4 shrink-0" />
            {status}
          </div>
        </div>
        <button
          onClick={act}
          disabled={busy || done || attendance === undefined}
          className="ml-auto shrink-0 rounded-full bg-white px-5 py-3 text-[13.5px] font-semibold text-stone-600 shadow-soft transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy ? "Getting location…" : done ? label : <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {label}</span>}
        </button>
      </div>
    </div>
  );
}
