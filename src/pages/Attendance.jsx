import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { todayStr, fmtTime, fmtHours, getLocation } from "../lib/attendance";
import { Card, SectionTitle, Pill } from "../components/ui/primitives";
import { Button } from "../components/ui/button";

export default function Attendance() {
  const { isAdmin } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-3xl text-ink mb-2">Attendance</h1>
      <p className="text-ink/50 text-sm mb-8">Your check-in history{isAdmin ? ", office location, and today's team view." : "."}</p>

      <div className="space-y-4">
        {isAdmin && <OfficeSetupPanel />}
        {isAdmin && <TeamAttendanceToday />}
        <MyAttendanceHistory />
      </div>
    </div>
  );
}

function OfficeSetupPanel() {
  const showToast = useToast();
  const [office, setOffice] = useState(undefined);
  const [radius, setRadius] = useState(200);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [pending, setPending] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await sb.from("office_locations").select("*").order("created_at").limit(1).maybeSingle();
    setOffice(data || null);
    if (data) setRadius(data.radius_meters);
  }

  useEffect(() => {
    load();
  }, []);

  async function captureCurrent() {
    setCapturing(true);
    try {
      const coords = await getLocation();
      setPending({ latitude: coords.latitude, longitude: coords.longitude });
    } catch (e) {
      showToast(e.message);
    } finally {
      setCapturing(false);
    }
  }

  function useManual() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast("Please enter valid coordinates — latitude between -90 and 90, longitude between -180 and 180.");
      return;
    }
    setPending({ latitude: lat, longitude: lng });
  }

  async function save() {
    if (!pending) return;
    setSaving(true);
    try {
      const { data: existing } = await sb.from("office_locations").select("id").order("created_at").limit(1).maybeSingle();
      const payload = { lat: pending.latitude, lng: pending.longitude, radius_meters: radius, updated_at: new Date().toISOString() };
      const { error } = existing
        ? await sb.from("office_locations").update(payload).eq("id", existing.id)
        : await sb.from("office_locations").insert(payload);
      if (error) throw error;
      showToast("✓ Office location saved!");
      setPending(null);
      await load();
    } catch (e) {
      showToast(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Office Location</SectionTitle>
      <p className="text-sm text-ink/50 mb-4">
        {office === undefined
          ? "Loading…"
          : office
          ? `Currently set: ${office.lat.toFixed(6)}, ${office.lng.toFixed(6)} · ${office.radius_meters}m radius`
          : "No office location set yet — nobody can check in until this is configured."}
      </p>

      <button onClick={captureCurrent} disabled={capturing} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-4 py-2 mb-4">
        {capturing ? "Getting location…" : "📍 Use My Current Location"}
      </button>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Manual Latitude</span>
          <input className="field-input" type="number" step="any" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
        </div>
        <div>
          <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Manual Longitude</span>
          <input className="field-input" type="number" step="any" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
        </div>
      </div>
      <button onClick={useManual} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-4 py-2 mb-4">Use These Coordinates</button>

      <div className="max-w-[180px] mb-4">
        <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Allowed Radius (meters)</span>
        <input className="field-input" type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value) || 200)} />
      </div>

      {pending && (
        <p className="text-sm text-stone-600 mb-3">📍 Using: {pending.latitude.toFixed(6)}, {pending.longitude.toFixed(6)} — click Save to confirm.</p>
      )}

      <Button disabled={!pending || saving} onClick={save}>{saving ? "Saving…" : "Save Office Location"}</Button>
    </Card>
  );
}

function TeamAttendanceToday() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    sb.from("attendance")
      .select("*")
      .eq("date", todayStr())
      .order("check_in_at", { ascending: true })
      .then(({ data }) => setRows(data || []));
  }, []);

  return (
    <Card>
      <SectionTitle>Today&apos;s Team Attendance {rows ? `(${rows.length} checked in)` : ""}</SectionTitle>
      {rows === null ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-ink/40">Nobody has checked in yet today.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink">{a.user_name || "—"}</div>
                <div className="text-xs text-ink/45">In: {fmtTime(a.check_in_at)}{a.check_out_at ? ` · Out: ${fmtTime(a.check_out_at)}` : " · Still in"}</div>
              </div>
              <Pill tone={a.check_out_at ? "neutral" : "green"}>{a.check_out_at ? fmtHours(a.check_in_at, a.check_out_at) : "● Present"}</Pill>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MyAttendanceHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    sb.from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(14)
      .then(({ data }) => setRows(data || []));
  }, [user.id]);

  return (
    <Card>
      <SectionTitle>My Attendance (last 14 days)</SectionTitle>
      {rows === null ? (
        <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-ink/40">No attendance recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const d = new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
            return (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-ink">{d}</div>
                  <div className="text-xs text-ink/45">In: {fmtTime(a.check_in_at)}{a.check_out_at ? ` · Out: ${fmtTime(a.check_out_at)}` : " · Not checked out"}</div>
                </div>
                <Pill tone="stone">{fmtHours(a.check_in_at, a.check_out_at) || "—"}</Pill>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
