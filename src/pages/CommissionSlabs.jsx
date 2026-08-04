import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { Card, SectionTitle } from "../components/ui/primitives";
import { Button } from "../components/ui/button";
import { BrandedLoader } from "../components/ui/BrandedLoader";

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
      <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Admin</div>
      <h1 className="font-display text-3xl text-ink mb-2">Commission Slabs</h1>
      <p className="text-ink/50 text-sm mb-8">Rates are ₹ per Gaj of plot size, not a percentage of sale price.</p>

      <div className="space-y-4">
        <Card>
          <SectionTitle>Add a Slab</SectionTitle>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Name *</span>
                <input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">₹ per Gaj *</span>
                <input className="field-input" type="number" value={form.commission_per_gaj} onChange={(e) => set("commission_per_gaj", e.target.value)} />
              </div>
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Description</span>
              <textarea className="field-input min-h-[60px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button disabled={busy} type="submit">{busy ? "Adding…" : "Add Slab"}</Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>All Slabs</SectionTitle>
          {slabs.length === 0 && <div className="text-sm text-ink/40">No slabs yet.</div>}
          <div className="space-y-3">
            {slabs.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{s.name} · ₹{Number(s.commission_per_gaj).toLocaleString("en-IN")}/Gaj</div>
                  {s.description && <div className="text-xs text-ink/45 mt-0.5">{s.description}</div>}
                </div>
                <button onClick={() => toggleActive(s)} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5 shrink-0">
                  {s.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
