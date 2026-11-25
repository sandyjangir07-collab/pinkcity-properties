export function fINR(n) {
  n = Math.round(n);
  const s = Math.abs(n).toString();
  let r;
  if (s.length <= 3) r = s;
  else {
    const l3 = s.slice(-3);
    const rest = s.slice(0, -3);
    r = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + l3;
  }
  return (n < 0 ? "-" : "") + "₹" + r;
}
export function fINRplain(n) {
  n = Math.round(n);
  const s = Math.abs(n).toString();
  if (s.length <= 3) return s;
  const l3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + l3;
}
export function calcEMI(P, r, n) {
  const rm = r / 12 / 100;
  const nm = n * 12;
  if (rm === 0) return P / nm;
  return (P * rm * Math.pow(1 + rm, nm)) / (Math.pow(1 + rm, nm) - 1);
}

// Ported exactly from the production calculator: government charges are
// Rajasthan stamp duty + registration combined, on the Agreement Value —
// not the Property Value, which is why the two are separate sliders.
export function computeCalculator({ pv, av, dpMode, dpRaw, ir, tenure, brokerageOn }) {
  const dpAmt = Math.min(pv, dpMode === "pct" ? (pv * dpRaw) / 100 : dpRaw);
  const loanAmount = pv - dpAmt;
  const emi = calcEMI(loanAmount, ir, tenure);
  const totalLoanRepayment = emi * tenure * 12;
  const totalInterest = totalLoanRepayment - loanAmount;
  const govtCharges = av * 0.088;
  const brokerage = brokerageOn ? pv * 0.015 : 0;
  const totalTransactionValue = pv + govtCharges + brokerage;
  const upfrontPayment = dpAmt + govtCharges + brokerage;
  const loanPayment = totalLoanRepayment;
  const splitTotal = upfrontPayment + loanPayment;
  const upfrontShare = splitTotal > 0 ? (upfrontPayment / splitTotal) * 100 : 0;
  return {
    dpAmt, loanAmount, emi, totalInterest, govtCharges, brokerage,
    totalTransactionValue, upfrontPayment, loanPayment, upfrontShare, loanShare: 100 - upfrontShare,
  };
}
