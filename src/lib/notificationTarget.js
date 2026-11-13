// Where tapping a notification should take you. One place, used by the bell list
// and by phone-push taps (which arrive as /?n=<notification id>).
//
// Returns { path } to go to a page, or { leadId } to open that lead's full screen.
export function notificationTarget(n, employeeId) {
  const type = n?.type || "";
  if (type === "lead_shared" || type === "lead_share_ended") {
    return n.related_id ? { leadId: n.related_id } : { path: "/leads" };
  }
  // Admin recorded a payout → the associate confirms it on Home.
  if (type === "commission_paid") return { path: "/" };
  // Associate confirmed / disputed a payout → admin checks it on Commissions.
  if (type === "commission_payout_response") return { path: "/commissions" };
  // Hierarchy, slab, document and profile notices all live on the person's own profile.
  if (type.startsWith("hierarchy") || type === "commission_changed" || type.startsWith("document_") || type.startsWith("profile_")) {
    return employeeId ? { path: `/employees/${employeeId}` } : { path: "/team" };
  }
  if (type.startsWith("visit")) return { path: "/schedule" };
  if (type.startsWith("token") || type.startsWith("approval")) return { path: "/approvals" };
  if (type.startsWith("resale")) return { path: "/resale" };
  if (type.startsWith("lead")) return { path: "/leads" };
  return { path: "/tasks" };
}
