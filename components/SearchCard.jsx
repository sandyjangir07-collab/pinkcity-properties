"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LOCATION_OPTIONS, TYPE_OPTIONS, BUDGET_OPTIONS } from "../lib/searchConstants";

const EASE = [0.22, 1, 0.36, 1];

export default function SearchCard({ filters, onChange, onSearch }) {
  const [openPicker, setOpenPicker] = useState(null); // "location" | "type" | "budget" | null

  return (
    <div className="relative rounded-[28px] bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_2px_4px_rgba(43,21,18,0.03),0_20px_60px_-20px_rgba(43,21,18,0.12)] p-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-1.5">
        <Field label="Location" value={filters.location} onClick={() => setOpenPicker("location")} />
        <Field label="Property type" value={filters.type} onClick={() => setOpenPicker("type")} />
        <Field label="Budget" value={filters.budget} onClick={() => setOpenPicker("budget")} />
        <button
          onClick={onSearch}
          className="flex items-center justify-center gap-2 rounded-3xl bg-stone-600 text-sand text-sm font-semibold px-6 py-3.5 hover:bg-stone-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          Search
        </button>
      </div>

      <Picker
        open={openPicker === "location"}
        title="Choose Location"
        onClose={() => setOpenPicker(null)}
        options={LOCATION_OPTIONS.map((o) => (typeof o === "string" ? { value: o } : o))}
        onSelect={(v) => {
          onChange({ ...filters, location: v });
          setOpenPicker(null);
        }}
      />
      <Picker
        open={openPicker === "type"}
        title="Property Type"
        onClose={() => setOpenPicker(null)}
        options={TYPE_OPTIONS.map((v) => ({ value: v }))}
        onSelect={(v) => {
          onChange({ ...filters, type: v });
          setOpenPicker(null);
        }}
      />
      <Picker
        open={openPicker === "budget"}
        title="Budget Range"
        onClose={() => setOpenPicker(null)}
        options={BUDGET_OPTIONS.map((v) => ({ value: v }))}
        onSelect={(v) => {
          onChange({ ...filters, budget: v });
          setOpenPicker(null);
        }}
      />
    </div>
  );
}

function Field({ label, value, onClick }) {
  return (
    <button onClick={onClick} className="text-left rounded-3xl bg-white/50 hover:bg-white border border-transparent hover:border-stone-200 px-5 py-3 transition-all hover:-translate-y-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">{label}</div>
      <div className="text-sm font-medium text-ink mt-0.5 truncate">{value}</div>
    </button>
  );
}

function Picker({ open, title, options, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="w-full sm:max-w-sm bg-sand rounded-t-3xl sm:rounded-3xl p-6"
          >
            <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto -mt-1 mb-4 sm:hidden" />
            <div className="font-display text-xl text-ink mb-4">{title}</div>
            <div className="space-y-1">
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onSelect(o.value)}
                  className="w-full text-left rounded-2xl px-4 py-3 hover:bg-ink/[0.04] transition-colors"
                >
                  {o.sub && <div className="text-[11px] text-stone-500 font-medium mb-0.5">{o.sub}</div>}
                  <div className="text-sm text-ink">{o.value}</div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
