import { sb } from "./supabase";
import { FACINGS } from "./resale";

// Reads a site plan with AI and turns the answer into form values the admin can confirm.
// The AI only reports what is printed on the plan; this file does the maths and the checks.

const SQM_TO_GAJ = 1.19599;

export function toGaj(value, unit) {
  const v = Number(value);
  if (!(v > 0)) return null;
  if (unit === "sq_ft") return v / 9;
  if (unit === "sq_m") return v * SQM_TO_GAJ;
  return v; // sq_yd and gaj are the same thing
}
export function dimsToGaj(length, width, unit) {
  const l = Number(length), w = Number(width);
  if (!(l > 0) || !(w > 0)) return null;
  const area = l * w;
  if (unit === "m") return area * SQM_TO_GAJ;
  if (unit === "yd") return area;
  return area / 9; // feet (the default for Jaipur plans)
}
const round2 = (n) => String(Math.round(n * 100) / 100);
const unitLabel = (u) => (u === "m" ? "m" : u === "yd" ? "yd" : "ft");
const clean = (s) => (typeof s === "string" ? s.trim() : "");

// One plot from the AI answer -> the values the form uses, with plain-language notes.
export function plotToFormValues(plot, shared = {}) {
  const warnings = [];
  const out = {};
  const evidence = clean(plot.evidence);

  out.plot_number = { value: clean(plot.plot_number), confidence: plot.confidence, evidence };

  const printed = toGaj(plot.area_value, plot.area_unit);
  const fromDims = dimsToGaj(plot.length, plot.width, plot.dimension_unit);
  let area = null, areaNote = "";
  if (printed != null) {
    area = printed;
    areaNote = plot.area_unit === "sq_ft" || plot.area_unit === "sq_m" ? `Printed as ${plot.area_value} ${plot.area_unit === "sq_ft" ? "sq ft" : "sq m"}, converted to Gaj` : "Printed on the plan";
    if (fromDims != null && Math.abs(fromDims - printed) / printed > 0.06) {
      warnings.push(`The printed area (${round2(printed)} Gaj) doesn't match the dimensions (${plot.length} × ${plot.width} ${unitLabel(plot.dimension_unit)} = ${round2(fromDims)} Gaj). Please check which is right.`);
    }
  } else if (fromDims != null) {
    area = fromDims;
    areaNote = `Worked out from ${plot.length} × ${plot.width} ${unitLabel(plot.dimension_unit)}`;
  }
  out.area = { value: area != null ? round2(area) : "", confidence: printed != null ? plot.confidence : fromDims != null ? "medium" : null, evidence: areaNote };

  const dims = plot.length > 0 && plot.width > 0 ? `${plot.length} × ${plot.width} ${unitLabel(plot.dimension_unit)}` : "";
  out.dimensions = { value: dims, confidence: dims ? plot.confidence : null, evidence };

  const facing = FACINGS.includes(plot.facing) ? plot.facing : "";
  out.facing = { value: facing, confidence: facing ? plot.confidence : null, evidence };

  out.scheme = { value: clean(shared.scheme_name), confidence: shared.scheme_confidence, evidence: "" };
  out.location = { value: clean(shared.location), confidence: shared.location_confidence, evidence: "" };
  return { fields: out, warnings };
}

export const FIELD_ORDER = [
  ["scheme", "Scheme / Township"],
  ["location", "Location"],
  ["plot_number", "Plot Number"],
  ["area", "Area (Gaj)"],
  ["dimensions", "Plot Dimensions"],
  ["facing", "Facing"],
];

// Ask the server to read the plan. `pages` are { dataUrl } JPEGs from planPages.js.
export async function readSitePlan(pages) {
  const images = pages.slice(0, 2).map((p) => ({ media_type: "image/jpeg", data: String(p.dataUrl).split(",")[1] }));
  const { data, error } = await sb.functions.invoke("read-site-plan", { body: { images } });
  if (error) {
    let msg = error.message;
    try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch { /* keep message */ }
    throw new Error(msg || "Couldn't read the plan.");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
