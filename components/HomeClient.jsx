"use client";

import { useMemo, useState } from "react";
import Hero from "./Hero";
import PropertyCard from "./PropertyCard";
import Link from "next/link";
import ConsultationForm from "./ConsultationForm";
import ResaleCard from "./resale/ResaleCard";
import { DEFAULT_FILTERS, applyFilters } from "../lib/searchConstants";

export default function HomeClient({ listings, resalePlots = [], resaleCount = 0 }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);

  const { filtered, isFiltered } = useMemo(() => {
    if (!appliedFilters) return { filtered: listings, isFiltered: false };
    return applyFilters(listings, appliedFilters);
  }, [listings, appliedFilters]);

  function handleSearch() {
    setAppliedFilters(filters);
    document.getElementById("properties")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <Hero listingCount={listings.length} filters={filters} onFilterChange={setFilters} onSearch={handleSearch} />

      <section id="properties" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-xl mb-16">
            <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-4">
              {isFiltered ? "Search Results" : "Featured Properties"}
            </div>
            <h2 className="font-display text-4xl sm:text-5xl text-ink leading-[1.05]">
              {isFiltered ? (
                <>
                  {filtered.length} propert{filtered.length === 1 ? "y" : "ies"}
                  <br />
                  <em className="italic font-light text-ink/45">match your search.</em>
                </>
              ) : (
                <>
                  Discover verified plots.
                  <br />
                  <em className="italic font-light text-ink/45">Where smart investments begin.</em>
                </>
              )}
            </h2>
            {isFiltered && (
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setAppliedFilters(null);
                }}
                className="text-sm font-medium text-stone-600 mt-4"
              >
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 py-24 text-center text-ink/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-14 h-14 object-contain mx-auto mb-4 opacity-25" />
              {isFiltered ? "No properties match your search — try adjusting your filters." : "No listings yet — check back soon."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p, i) => (
                <PropertyCard key={p.id} p={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
      {resalePlots.length > 0 && (
        <section className="relative pb-24 sm:pb-32">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-12">
              <div className="max-w-xl">
                <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-4">Resale Plots</div>
                <h2 className="font-display text-4xl sm:text-5xl text-ink leading-[1.05]">
                  Ready-to-buy resale plots.
                  <br />
                  <em className="italic font-light text-ink/45">Size, rate and demand upfront.</em>
                </h2>
              </div>
              <Link href="/resale" className="text-sm font-medium text-stone-600 shrink-0">
                See all {resaleCount} plot{resaleCount === 1 ? "" : "s"} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resalePlots.map((p) => <ResaleCard key={p.public_code} p={p} />)}
            </div>
          </div>
        </section>
      )}
      <ConsultationForm />
    </>
  );
}
