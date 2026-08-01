import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { todayStr, fmtTime, fmtHours, getLocation } from "../lib/attendance";

export default function Attendance() {
  const { isAdmin } = useAuth();

  return (
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Attendance</h1>
      <p className="page-sub">Your check-in history{isAdmin ? ", office location, and today's team view." : "."}</p>

      {isAdmin && <OfficeSetupPanel />}
      {isAdmin && <TeamAttendanceToday />}
      <MyAttendanceHistory />
    </div>
  );
}

function OfficeSetupPanel() {
  const showToast = useToast();
  const [office, setOffice] = useState(undefined); // undefined = loading, null = not set
  const [radius, setRadius] = useState(200);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [pending, setPending] = useState(null); // { latitude, longitude } | null
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
    <div className="card">
      <h2 className="section-title">Office Location</h2>
      <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
        {office === undefined
          ? "Loading…"
          : office
          ? `Currently set: ${office.lat.toFixed(6)}, ${office.lng.toFixed(6)} · ${office.radius_meters}m radius`
          : "No office location set yet — nobody can check in until this is configured."}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <button className="btn btn-secondary" style={{ width: "auto" }} disabled={capturing} onClick={captureCurrent}>
          {capturing ? "Getting location…" : "📍 Use My Current Location"}
        </button>
      </div>

      <div className="field-grid-2">
        <div className="field">
          <label className="fl">Manual Latitude</label>
          <input className="fi" type="number" step="any" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">Manual Longitude</label>
          <input className="fi" type="number" step="any" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-secondary" style={{ width: "auto", marginBottom: 14 }} onClick={useManual}>
        Use These Coordinates
      </button>

      <div className="field" style={{ maxWidth: 200 }}>
        <label className="fl">Allowed Radius (meters)</label>
        <input className="fi" type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value) || 200)} />
      </div>

      {pending && (
        <p style={{ fontSize: 13, color: "var(--primary)", marginBottom: 12 }}>
          📍 Using: {pending.latitude.toFixed(6)}, {pending.longitude.toFixed(6)} — click Save to confirm.
        </p>
      )}

      <button className="btn btn-primary" disabled={!pending || saving} onClick={save}>
        {saving ? "Saving…" : "Save Office Location"}
      </button>
    </div>
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
    <div className="card">
      <h2 className="section-title">Today's Team Attendance {rows ? `(${rows.length} checked in)` : ""}</h2>
      {rows === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nobody has checked in yet today.</div>
      ) : (
        rows.map((a) => (
          <div key={a.id} className="info-row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="info-row-value">{a.user_name || "—"}</div>
              <div className="info-row-label">
                In: {fmtTime(a.check_in_at)}
                {a.check_out_at ? ` · Out: ${fmtTime(a.check_out_at)}` : " · Still in"}
              </div>
            </div>
            <span className={"pill " + (a.check_out_at ? "pill-neutral" : "pill-green")}>
              {a.check_out_at ? fmtHours(a.check_in_at, a.check_out_at) : "● Present"}
            </span>
          </div>
        ))
      )}
    </div>
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
    <div className="card">
      <h2 className="section-title">My Attendance (last 14 days)</h2>
      {rows === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No attendance recorded yet.</div>
      ) : (
        rows.map((a) => {
          const d = new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
          return (
            <div key={a.id} className="info-row" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="info-row-value">{d}</div>
                <div className="info-row-label">
                  In: {fmtTime(a.check_in_at)}
                  {a.check_out_at ? ` · Out: ${fmtTime(a.check_out_at)}` : " · Not checked out"}
                </div>
              </div>
              <span className="pill pill-primary">{fmtHours(a.check_in_at, a.check_out_at) || "—"}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
