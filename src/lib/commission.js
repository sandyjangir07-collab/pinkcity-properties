// Replicates the production commission math: for each approved deal, use
// whichever commission slab was actually in effect (by effective_date) on
// the deal's approval date, and pay rate × plot size in Gaj — not a cut of
// the sale price.
export function computeCommission({ deals, assignments, slabsById }) {
  const sortedAssignments = [...assignments].sort(
    (a, b) => new Date(a.effective_date) - new Date(b.effective_date)
  );

  function slabRateAt(date) {
    let applicable = null;
    for (const a of sortedAssignments) {
      if (new Date(a.effective_date) <= date) applicable = a;
      else break;
    }
    if (!applicable) return null;
    const slab = slabsById[applicable.commission_slab_id];
    return slab ? Number(slab.commission_per_gaj) : null;
  }

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  let totalDeals = 0;
  let totalSales = 0;
  let totalCommission = 0;
  let thisMonthCommission = 0;

  for (const deal of deals) {
    totalDeals += 1;
    totalSales += Number(deal.sale_amount) || 0;
    const approvalDate = new Date(deal.reviewed_at);
    const rate = slabRateAt(approvalDate);
    const plotSize = parseFloat(deal.colony_units?.unit_size ?? "");
    if (rate != null && !isNaN(plotSize)) {
      const commission = rate * plotSize;
      totalCommission += commission;
      const dealMonthKey = `${approvalDate.getFullYear()}-${approvalDate.getMonth()}`;
      if (dealMonthKey === thisMonthKey) thisMonthCommission += commission;
    }
  }

  const currentRate = slabRateAt(now);

  return { totalDeals, totalSales, totalCommission, thisMonthCommission, currentRate };
}
