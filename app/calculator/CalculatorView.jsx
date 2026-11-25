"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../../lib/supabase";
import { fINR, fINRplain, computeCalculator } from "../../lib/calculatorMath";
import PageHero from "../../components/PageHero";
import { Button } from "../../components/ui/button";

const EASE = [0.22, 1, 0.36, 1];

export default function CalculatorView() {
  const [pv, setPv] = useState(6800000);
  const [av, setAv] = useState(5500000);
  const [dpMode, setDpMode] = useState("pct"); // "pct" | "amt"
  const [dpRaw, setDpRaw] = useState(20); // percent or absolute rupees, depending on mode
  const [ir, setIr] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [brokerageOn, setBrokerageOn] = useState(true);
  const [loanAmtTouched, setLoanAmtTouched] = useState(false);
  const [loanAmtOverride, setLoanAmtOverride] = useState("");

  const result = useMemo(
    () => computeCalculator({ pv, av, dpMode, dpRaw, ir, tenure, brokerageOn }),
    [pv, av, dpMode, dpRaw, ir, tenure, brokerageOn]
  );

  function switchDpMode(mode) {
    if (mode === dpMode) return;
    if (mode === "amt") {
      const amt = Math.round((pv * dpRaw) / 100 / 50000) * 50000;
      setDpMode("amt");
      setDpRaw(Math.min(pv, amt));
    } else {
      const pct = Math.round((dpRaw / pv) * 100);
      setDpMode("pct");
      setDpRaw(Math.min(80, Math.max(10, pct)));
    }
  }

  const dpMin = dpMode === "pct" ? 10 : 0;
  const dpMax = dpMode === "pct" ? 80 : pv;
  const dpStep = dpMode === "pct" ? 5 : 50000;

  const loanAmountForForm = loanAmtTouched ? loanAmtOverride : fINRplain(Math.round(result.loanAmount));

  return (
    <>
      <PageHero
        eyebrow="True Cost Calculator"
        title={<>What will this property <em className="italic font-light text-ink/45">really</em> cost you?</>}
        description="Drag the sliders or type exact numbers — every figure below updates live, including the government charges most calculators leave out."
      />
      <div className="pb-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Sliders column */}
            <div className="rounded-3xl bg-white/70 border border-ink/[0.06] p-7 space-y-7">
              <Slider label="Property Value" value={pv} onChange={setPv} min={1500000} max={30000000} step={100000} format={fINR} />
              <Slider
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Agreement Value
                    <InfoTip text="The value stated in the sale agreement. Government charges are calculated on this — not the property value — since the two can differ." />
                  </span>
                }
                value={av}
                onChange={setAv}
                min={1000000}
                max={30000000}
                step={100000}
                format={fINR}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ink">Down Payment</span>
                  <div className="flex rounded-full bg-stone-50 p-0.5">
                    {["pct", "amt"].map((m) => (
                      <button
                        key={m}
                        onClick={() => switchDpMode(m)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${dpMode === m ? "bg-stone-600 text-sand" : "text-ink/50"}`}
                      >
                        {m === "pct" ? "%" : "₹"}
                      </button>
                    ))}
                  </div>
                </div>
                <SliderTrack value={dpRaw} onChange={setDpRaw} min={dpMin} max={dpMax} step={dpStep} />
                <div className="text-xs text-ink/45 mt-2">
                  = {fINR(result.dpAmt)} upfront · Loan: {fINR(result.loanAmount)}
                </div>
              </div>

              <Slider label="Interest Rate" value={ir} onChange={setIr} min={7} max={12} step={0.05} format={(v) => `${v.toFixed(2)}%`} />
              <Slider label="Loan Tenure" value={tenure} onChange={setTenure} min={5} max={30} step={1} format={(v) => `${v} yrs`} />

              <button onClick={() => setBrokerageOn((b) => !b)} className="flex items-center gap-3 w-full text-left">
                <span className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${brokerageOn ? "bg-stone-600" : "bg-ink/15"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${brokerageOn ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </span>
                <span className="text-sm text-ink/70">Apply brokerage (1.5% of Property Value)</span>
              </button>
            </div>

            {/* Results column */}
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE }}
                className="rounded-3xl bg-gradient-to-br from-ink to-[#1a120f] p-7"
              >
                <div className="text-xs text-sand/45 flex items-center gap-1.5">
                  Monthly EMI
                  <InfoTip text="Equated Monthly Installment — the fixed amount you pay every month, covering both principal and interest, until the loan is fully repaid." dark />
                </div>
                <div className="font-display text-4xl text-sand mt-1">
                  {fINR(result.emi)}<span className="text-base text-sand/40">/mo</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10">
                  <MetaCol label="Loan amount" value={fINR(result.loanAmount)} />
                  <MetaCol label="Total interest" value={fINR(result.totalInterest)} />
                  <MetaCol label="Tenure" value={`${tenure} yrs`} />
                </div>
              </motion.div>

              <div className="rounded-3xl bg-white/70 border border-ink/[0.06] p-7">
                <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-4">Final Summary</div>
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="Property Value" value={fINR(pv)} />
                  <SummaryCard label="Agreement Value" value={fINR(av)} />
                  <SummaryCard label="Govt. Charges (8.8%)" value={fINR(result.govtCharges)} />
                  <SummaryCard label="Brokerage (1.5%)" value={fINR(result.brokerage)} />
                  <SummaryCard label="Down Payment" value={fINR(result.dpAmt)} />
                  <SummaryCard label="Loan Amount" value={fINR(result.loanAmount)} />
                  <SummaryCard label="Monthly EMI" value={fINR(result.emi)} />
                  <SummaryCard label="Upfront Payment Req." value={fINR(result.upfrontPayment)} hilite />
                </div>
                <div className="mt-3">
                  <SummaryCard label="Total Transaction Value" value={fINR(result.totalTransactionValue)} hilite full />
                </div>
              </div>

              <div className="rounded-3xl bg-white/70 border border-ink/[0.06] p-7">
                <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-4">Upfront vs. Loan Payment</div>
                <div className="h-2.5 rounded-full bg-ink/[0.06] overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-stone-500 to-stone-600" style={{ width: `${result.upfrontShare}%` }} />
                  <div className="h-full bg-gradient-to-r from-brass to-brass-light" style={{ width: `${result.loanShare}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-ink/50 mb-1"><span className="w-2 h-2 rounded-full bg-stone-600" /> Upfront Payment</div>
                    <div className="font-display text-lg text-ink">{fINR(result.upfrontPayment)}</div>
                    <div className="text-[11px] text-ink/40 mt-0.5">Down payment + govt. charges + brokerage</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-ink/50 mb-1"><span className="w-2 h-2 rounded-full bg-brass" /> Loan Payment</div>
                    <div className="font-display text-lg text-ink">{fINR(result.loanPayment)}</div>
                    <div className="text-[11px] text-ink/40 mt-0.5">Principal + interest over the tenure</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <LoanOfferForm defaultLoanAmount={loanAmountForForm} onTouchLoanAmount={(v) => { setLoanAmtTouched(true); setLoanAmtOverride(v); }} />
        </div>
      </div>
    </>
  );
}

function Slider({ label, value, onChange, min, max, step, format }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-sm font-semibold text-stone-600">{format(value)}</span>
      </div>
      <SliderTrack value={value} onChange={onChange} min={min} max={max} step={step} />
    </div>
  );
}

function SliderTrack({ value, onChange, min, max, step }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-2 rounded-full bg-ink/[0.07]">
      <div className="absolute inset-y-0 left-0 rounded-full bg-stone-600" style={{ width: `${pct}%` }} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-stone-600 border-2 border-white shadow pointer-events-none" style={{ left: `calc(${pct}% - 8px)` }} />
    </div>
  );
}

function InfoTip({ text, dark }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className={`w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center ${dark ? "bg-white/15 text-sand/80" : "bg-ink/10 text-ink/50"}`}
      >
        i
      </button>
      {open && (
        <span className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl bg-ink text-sand text-[11px] leading-relaxed p-3 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

function MetaCol({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-sand/35 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium text-sand mt-0.5">{value}</div>
    </div>
  );
}

function SummaryCard({ label, value, hilite, full }) {
  return (
    <div className={`rounded-2xl p-4 ${hilite ? "bg-stone-50" : "bg-ink/[0.02]"} ${full ? "col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide text-ink/40 mb-1">{label}</div>
      <div className={`font-display text-lg ${hilite ? "text-stone-600" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function LoanOfferForm({ defaultLoanAmount, onTouchLoanAmount }) {
  const [form, setForm] = useState({ name: "", phone: "", occupation: "Salaried", company: "", salary: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setErr("Please fill in your name and phone.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { error } = await sb.from("leads").insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        occupation: form.occupation,
        company_name: form.company.trim() || null,
        monthly_salary: form.salary.trim() || null,
        loan_amount_required: defaultLoanAmount || null,
        source: "loan_calculator",
        status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSent(true);
      setForm({ name: "", phone: "", occupation: "Salaried", company: "", salary: "" });
      setTimeout(() => setSent(false), 4000);
    } catch (e2) {
      setErr("Something went wrong saving your request — please try again or WhatsApp us.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="max-w-xl mx-auto mt-14"
    >
      <div className="text-center mb-6">
        <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-2">Get a Personalized Offer</div>
        <h2 className="font-display text-2xl text-ink">Talk to our loan partners</h2>
        <p className="text-sm text-ink/50 mt-2">15+ bank tie-ups. We&apos;ll call you with your best rate.</p>
      </div>
      <form onSubmit={submit} className="rounded-3xl bg-white/70 border border-ink/[0.06] p-7 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your Name"><input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Verma" /></Field>
          <Field label="Contact Number"><input className="field-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98XXX XXXXX" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Occupation">
            <select className="field-input" value={form.occupation} onChange={(e) => set("occupation", e.target.value)}>
              <option value="Salaried">Salaried</option>
              <option value="Self Employed">Self Employed</option>
            </select>
          </Field>
          <Field label="Company Name"><input className="field-input" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Where you work" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly Salary (₹)"><input className="field-input" value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="e.g. 85,000" /></Field>
          <Field label="Loan Amount Required (₹)">
            <input
              className="field-input"
              defaultValue={defaultLoanAmount}
              onChange={(e) => onTouchLoanAmount(e.target.value)}
              placeholder="e.g. 54,40,000"
            />
          </Field>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">
          {busy ? "Saving…" : sent ? "✓ Request sent — we'll call you soon" : "Get My Loan Offer"}
        </Button>
      </form>
    </motion.div>
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
