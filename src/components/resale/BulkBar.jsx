import { useState } from "react";
import { X } from "lucide-react";
import { RESALE_STATUS } from "../../lib/resale";

// Appears when plots are ticked: change many at once. Archiving asks for a second tap.
export default function BulkBar({ count, total, busy, onApply, onSelectAll, onClear, onDone }) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const btn = "min-h-[40px] shrink-0 rounded-full border border-ink/10 bg-white px-3.5 text-[12.5px] font-semibold text-ink/75 active:scale-95 disabled:opacity-40";
  const apply = (patch) => { setConfirmArchive(false); onApply(patch); };
  return (
    <div className="fixed inset-x-3 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-3xl rounded-[22px] border border-ink/[0.08] bg-surface/95 p-3 shadow-lift backdrop-blur md:bottom-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-[13px] font-semibold text-ink">{count} selected</div>
        <div className="flex items-center gap-3 text-[12px] font-semibold">
          {count < total && <button onClick={onSelectAll} className="text-stone-600">Select all {total}</button>}
          {count > 0 && <button onClick={onClear} className="text-ink/45">Clear</button>}
          <button onClick={onDone} aria-label="Exit select mode" className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink/60"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
        {Object.entries(RESALE_STATUS).map(([k, v]) => (
          <button key={k} disabled={busy || count === 0} onClick={() => apply({ status: k })} className={btn}>Mark {v.label}</button>
        ))}
        <button disabled={busy || count === 0} onClick={() => apply({ is_public: true })} className={btn}>Make public</button>
        <button disabled={busy || count === 0} onClick={() => apply({ is_public: false })} className={btn}>Hide from public</button>
        <button disabled={busy || count === 0} onClick={() => apply({ featured: true })} className={btn}>★ Feature</button>
        <button disabled={busy || count === 0} onClick={() => apply({ featured: false })} className={btn}>Unfeature</button>
        <button disabled={busy || count === 0} onClick={() => apply({ last_confirmed_at: new Date().toISOString() })} className={btn}>✓ Still available</button>
        <button
          disabled={busy || count === 0}
          onClick={() => (confirmArchive ? apply({ archived: true }) : setConfirmArchive(true))}
          className={`${btn} ${confirmArchive ? "!border-red-500 !bg-red-500 !text-white" : "!text-red-600"}`}
        >
          {confirmArchive ? `Tap again to archive ${count}` : "Archive"}
        </button>
      </div>
    </div>
  );
}
