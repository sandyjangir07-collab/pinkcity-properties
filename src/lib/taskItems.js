// What needs the user's action right now, from the live counts. Used by the Home
// teaser and the Tasks tab, so both always agree.
export function actionItems(c, isAdmin) {
  if (!c) return [];
  const items = [
    { key: "overdue", n: c.overdue, label: "Overdue follow-ups", hint: "Leads you meant to call back", to: "/today", tone: "red" },
    { key: "followups", n: c.followupsToday, label: "Follow-ups due today", hint: "Calls and WhatsApps for today", to: "/today", tone: "amber" },
    { key: "visits", n: c.visitsToday, label: "Site visits today", hint: "On your calendar for today", to: "/schedule", tone: "teal" },
    { key: "payouts", n: c.payoutsToConfirm, label: "Payouts to confirm", hint: "Tell the admin you received them", to: "/", tone: "emerald" },
  ];
  if (isAdmin) {
    items.push(
      { key: "tokens", n: c.tokensPending, label: "Token reviews", hint: "Waiting for your approval", to: "/tasks#tokens", tone: "violet" },
      { key: "approvals", n: c.profilesPending + c.hierarchyPending, label: "Approvals", hint: "New profiles and hierarchy requests", to: "/approvals", tone: "emerald" },
      { key: "listings", n: c.listingsPending, label: "Listings to approve", hint: "Submitted by the team", to: "/listings", tone: "blue" },
      { key: "requests", n: c.resaleRequests, label: "Resale requests", hint: "Corrections and availability updates", to: "/resale", tone: "teal" },
      { key: "disputes", n: c.payoutDisputes, label: "Payouts reported not received", hint: "An associate says it didn't arrive", to: "/commissions", tone: "red" }
    );
  }
  return items.filter((i) => i.n > 0);
}

export const TONE_CLASSES = {
  red: { bg: "bg-red-50", ring: "border-red-100", icon: "bg-red-100 text-red-600", chip: "bg-red-100 text-red-700" },
  amber: { bg: "bg-amber-50", ring: "border-amber-100", icon: "bg-amber-100 text-amber-700", chip: "bg-amber-100 text-amber-800" },
  teal: { bg: "bg-teal-50", ring: "border-teal-100", icon: "bg-teal-100 text-teal-700", chip: "bg-teal-100 text-teal-800" },
  emerald: { bg: "bg-emerald-50", ring: "border-emerald-100", icon: "bg-emerald-100 text-emerald-700", chip: "bg-emerald-100 text-emerald-800" },
  violet: { bg: "bg-violet-50", ring: "border-violet-100", icon: "bg-violet-100 text-violet-700", chip: "bg-violet-100 text-violet-800" },
  blue: { bg: "bg-blue-50", ring: "border-blue-100", icon: "bg-blue-100 text-blue-700", chip: "bg-blue-100 text-blue-800" },
};
