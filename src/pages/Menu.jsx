import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, ChevronRight, ExternalLink } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { menuSections, searchSections } from "../lib/menuConfig";

// Every module, grouped into five categories, with search.
export default function Menu() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const all = useMemo(() => menuSections(isAdmin), [isAdmin]);
  const sections = useMemo(() => searchSections(all, q), [all, q]);
  const total = all.reduce((n, c) => n + c.items.length, 0);
  const shown = sections.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">PinkCity Properties &amp; Consultants</div>
      <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">Menu</h1>
      <p className="mt-2.5 text-[13.5px] text-ink/50">All {total} modules, grouped by what you're doing.</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          type="search"
          className="field-input !min-h-[52px] !pl-11 !pr-11 !text-[15px]"
          placeholder="Search modules — e.g. payout, token, brochure"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search modules"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink/40 hover:bg-ink/[0.05]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {q && <p className="mt-3 text-[12.5px] text-ink/45">{shown} module{shown === 1 ? "" : "s"} found</p>}

      {sections.length === 0 && (
        <div className="mt-5 rounded-2xl border border-ink/[0.06] bg-surface p-10 text-center">
          <div className="text-[15px] font-semibold text-ink">No module matches "{q}"</div>
          <p className="mt-1.5 text-[13px] text-ink/45">Try a simpler word, like leads, plots or team.</p>
          <button onClick={() => setQ("")} className="mt-4 min-h-[44px] rounded-full bg-stone-600 px-6 text-[13px] font-semibold text-white">Clear search</button>
        </div>
      )}

      <div className="mt-6 space-y-7">
        {sections.map((c) => (
          <section key={c.id} aria-label={c.title}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50">{c.title}</div>
                <div className="mt-1 text-[11.5px] text-ink/35">{c.caption}</div>
              </div>
              <span className="h-px flex-1 -translate-y-0.5 bg-gradient-to-r from-ink/10 to-transparent" />
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {c.items.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className="flex min-h-[68px] items-center gap-3.5 rounded-[22px] border border-ink/[0.05] bg-surface px-4 py-3 shadow-soft transition-all active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${m.tone.bg}`}>
                    <m.Icon className={`h-[19px] w-[19px] ${m.tone.text}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-ink">{m.label}</span>
                    <span className="block truncate text-[12px] text-ink/45">{m.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/25" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <a href="https://pinkcityproperties.com" target="_blank" rel="noreferrer" className="mt-8 flex min-h-[48px] items-center justify-center gap-1.5 text-[12.5px] font-medium text-ink/50">
        View website <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
