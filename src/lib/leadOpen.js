import { sb } from "./supabase";

// A visit can point at a lead that has since been deleted, or that this person
// can't see. Check first, so tapping a visit never opens an empty screen.
export async function leadAvailable(leadId) {
  if (!leadId) return false;
  const { data } = await sb.from("leads").select("id").eq("id", leadId).is("deleted_at", null).maybeSingle();
  return !!data;
}
