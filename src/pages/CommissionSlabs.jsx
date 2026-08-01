import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useToast } from "../hooks/useToast";

export default function CommissionSlabs() {
  const [slabs, setSlabs] = useState(null);
  const [form, setForm] = useState({ name: "", commission_per_gaj: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const showToast = useToast();

  async function load() {
    const { data } = await sb.from("commission_slabs").select("*").order("created_at", { ascending: false });
    setSlabs(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.commission_per_gaj) {
      setErr("Name and rate are required.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await sb.from("commission_slabs").insert({
      name: form.name.trim(),
      commission_per_gaj: Number(form.commission_per_gaj),
      description: form.description.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ name: "", commission_per_gaj: "", description: "" });
    showToast("Slab created.");
    load();
  }

  async function toggleActive(slab) {
    await sb.from("commission_slabs").update({ is_active: !slab.is_active }).eq("id", slab.id);
    load();
  }

  if (slabs === null) {
    return (
      <div className="page">
        <div className="center-loading"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-eyebrow">Admin</div>
      <h1 className="page-title">Commission Slabs</h1>
      <p className="page-sub">Rates are ₹ per Gaj of plot size, not a percentage of sale price.</p>

      <div className="card">
        <h2 className="section-title">Add a Slab</h2>
        <form onSubmit={create}>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Name *</label>
              <input className="fi" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">₹ per Gaj *</label>
              <input className="fi" type="number" value={form.commission_per_gaj} onChange={(e) => set("commission_per_gaj", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="fl">Description</label>
            <textarea className="fi" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Adding…" : "Add Slab"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title">All Slabs</h2>
        {slabs.length === 0 && <div className="info-row-label">No slabs yet.</div>}
        {slabs.map((s) => (
          <div key={s.id} className="info-row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="info-row-value">{s.name} · ₹{Number(s.commission_per_gaj).toLocaleString("en-IN")}/Gaj</div>
              {s.description && <div className="info-row-label">{s.description}</div>}
            </div>
            <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => toggleActive(s)}>
              {s.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
