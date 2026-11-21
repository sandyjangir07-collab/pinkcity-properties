// Personal lead lists ("Favourites", "Hot prospects", ...). Each person has their own; the database
// keeps them private, so an admin's lists never show up for the team.
import { sb } from "./supabase";

export const LIST_COLORS = ["#D9A431", "#B01F4F", "#2F7D6B", "#3B6FB6", "#7A4FB3", "#E07B39", "#5B6770"];
export const MAX_LISTS = 12;
export const MAX_NAME = 30;
export const DEFAULT_LIST_NAME = "Favourites";

export async function fetchLists() {
  const { data } = await sb.from("lead_lists").select("*").order("position", { ascending: true }).order("created_at", { ascending: true });
  return data || [];
}

// leadId -> [listId, ...] for every lead this person has put in a list.
export async function fetchMemberships() {
  const { data } = await sb.from("lead_list_items").select("list_id,lead_id");
  const map = new Map();
  (data || []).forEach((r) => {
    const cur = map.get(r.lead_id) || [];
    cur.push(r.list_id);
    map.set(r.lead_id, cur);
  });
  return map;
}

export function nextColor(lists) {
  return LIST_COLORS.find((c) => !lists.some((l) => l.color === c)) || LIST_COLORS[lists.length % LIST_COLORS.length];
}

export function nameProblem(name, lists, exceptId) {
  const n = (name || "").trim();
  if (!n) return "Give the list a name.";
  if (n.length > MAX_NAME) return `Keep it under ${MAX_NAME} characters.`;
  if (lists.some((l) => l.id !== exceptId && l.name.trim().toLowerCase() === n.toLowerCase())) return "You already have a list with that name.";
  return "";
}

export async function createList(name, lists) {
  const problem = nameProblem(name, lists);
  if (problem) return { error: { message: problem } };
  if (lists.length >= MAX_LISTS) return { error: { message: `You can have up to ${MAX_LISTS} lists.` } };
  return sb.from("lead_lists").insert({ name: name.trim(), color: nextColor(lists), position: lists.length }).select().single();
}

export async function renameList(id, name, lists) {
  const problem = nameProblem(name, lists, id);
  if (problem) return { error: { message: problem } };
  return sb.from("lead_lists").update({ name: name.trim() }).eq("id", id);
}

export function deleteList(id) {
  return sb.from("lead_lists").delete().eq("id", id);
}

export function addToList(listId, leadId) {
  return sb.from("lead_list_items").insert({ list_id: listId, lead_id: leadId });
}

export function removeFromList(listId, leadId) {
  return sb.from("lead_list_items").delete().eq("list_id", listId).eq("lead_id", leadId);
}
