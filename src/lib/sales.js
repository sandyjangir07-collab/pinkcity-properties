// Plot sizes are stored as plain Gaj numbers for plots in the system ("102.00");
// plots typed in by hand are free text ("200 Gaj"), so read the leading number
// and convert the common alternative units.
export function gajOf(areaText) {
  if (areaText == null) return 0;
  const text = String(areaText).trim();
  const n = parseFloat(text.replace(/,/g, ""));
  if (Number.isNaN(n)) return 0;
  if (/sq\.?\s*ft|sqft/i.test(text)) return n / 9;
  if (/sq\.?\s*m|sqm|sq\.?\s*mt/i.test(text)) return n * 1.19599;
  return n;
}

export function formatGaj(n) {
  return `${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Gaj`;
}

export function areaText(a) {
  if (!a) return "";
  return /^[\d.,]+$/.test(String(a).trim()) ? formatGaj(gajOf(a)) : String(a);
}

// A sale can cover several plots: each plot is its own token_submissions row,
// tied together by sale_group_id (older single-plot sales have none, so each
// row is its own sale). Commission sits on the first plot's row only, so
// summing a group's commission never double counts.
export function groupSales(rows) {
  const map = new Map();
  for (const d of rows) {
    const key = d.sale_group_id || d.id;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        ids: [],
        buyer_name: d.buyer_name,
        buyer_phone: d.buyer_phone,
        associate_name: d.associate_name,
        associate_id: d.associate_employee_id,
        reviewed_at: d.reviewed_at,
        is_manual: d.is_manual,
        sale_amount: null,
        commission: 0,
        totalGaj: 0,
        plots: [],
      };
      map.set(key, g);
    }
    g.ids.push(d.id);
    if (d.sale_amount != null) g.sale_amount = (g.sale_amount || 0) + Number(d.sale_amount);
    g.commission += Number(d.commission_amount) || 0;
    if (d.buyer_phone && !g.buyer_phone) g.buyer_phone = d.buyer_phone;
    g.totalGaj += gajOf(d.plotArea);
    g.plots.push({
      rowId: d.id,
      unitId: d.unit_id,
      listingId: d.listing_id,
      township: d.township,
      plotNo: d.plotNo,
      plotArea: d.plotArea,
      manualTownship: d.manual_township,
      manualPlotNo: d.manual_plot_no,
      manualPlotArea: d.manual_plot_area,
    });
  }
  return [...map.values()];
}

export function plotLabel(p) {
  return [p.township, p.plotNo ? `Plot ${p.plotNo}` : "", areaText(p.plotArea)].filter(Boolean).join(" · ") || "—";
}
