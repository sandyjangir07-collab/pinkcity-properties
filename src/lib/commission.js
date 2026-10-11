// Commission is now whatever the admin manually typed in per deal at
// approval time (token_submissions.commission_amount) — not a computed
// rate × plot-size figure. Commission Slabs are no longer used here.
export function computeCommission({ deals }) {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

  let totalDeals = 0;
  let totalSales = 0;
  let totalCommission = 0;
  let thisMonthCommission = 0;

  const seenSales = new Set();
  for (const deal of deals) {
    const saleKey = deal.sale_group_id || deal.id;
    if (!seenSales.has(saleKey)) {
      seenSales.add(saleKey);
      totalDeals += 1;
    }
    totalSales += Number(deal.sale_amount) || 0;
    const commission = Number(deal.commission_amount) || 0;
    totalCommission += commission;

    const approvalDate = new Date(deal.reviewed_at);
    const dealMonthKey = `${approvalDate.getFullYear()}-${approvalDate.getMonth()}`;
    if (dealMonthKey === thisMonthKey) thisMonthCommission += commission;
  }

  return { totalDeals, totalSales, totalCommission, thisMonthCommission };
}
