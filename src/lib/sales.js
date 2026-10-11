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
        plots: [],
      };
      map.set(key, g);
    }
    g.ids.push(d.id);
    if (d.sale_amount != null) g.sale_amount = (g.sale_amount || 0) + Number(d.sale_amount);
    g.commission += Number(d.commission_amount) || 0;
    if (d.buyer_phone && !g.buyer_phone) g.buyer_phone = d.buyer_phone;
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
  return [p.township, p.plotNo ? `Plot ${p.plotNo}` : "", p.plotArea].filter(Boolean).join(" · ") || "—";
}
