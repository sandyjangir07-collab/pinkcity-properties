import { useEffect, useState } from "react";
import { Check, Plus, Star, Pencil, Trash2 } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader } from "../ui/Sheet";
import { MAX_LISTS, MAX_NAME, DEFAULT_LIST_NAME, fetchLists, createList, renameList, deleteList, addToList, removeFromList } from "../../lib/leadLists";

// Pick which of your lists a lead belongs to. Lists are personal: only you see them.
export default function LeadListsSheet({ open, lead, onClose, onChanged }) {
  const showToast = useToast();
  const [lists, setLists] = useState([]);
  const [member, setMember] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState({}); // listId -> draft name
  const [confirmDel, setConfirmDel] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;
    let live = true;
    setLoaded(false);
    setManage(false);
    setConfirmDel(null);
    setEditing({});
    setNewName("");
    (async () => {
      const [ls, items] = await Promise.all([fetchLists(), sb.from("lead_list_items").select("list_id").eq("lead_id", lead.id)]);
      if (!live) return;
      setLists(ls);
      setMember(new Set((items.data || []).map((r) => r.list_id)));
      setLoaded(true);
    })();
    return () => { live = false; };
  }, [open, lead?.id]);

  if (!lead) return <Sheet open={false} onClose={onClose} />;

  function report(nextMember) {
    onChanged?.(nextMember.size);
  }

  async function toggle(list) {
    const was = member.has(list.id);
    const next = new Set(member);
    if (was) next.delete(list.id); else next.add(list.id);
    setMember(next);
    const { error } = was ? await removeFromList(list.id, lead.id) : await addToList(list.id, lead.id);
    if (error) {
      setMember(member);
      return showToast("Couldn't update the list. Try again.");
    }
    report(next);
  }

  async function create(e) {
    e?.preventDefault();
    const name = newName.trim() || (lists.length === 0 ? DEFAULT_LIST_NAME : "");
    setBusy(true);
    const { data, error } = await createList(name, lists);
    if (error || !data) {
      setBusy(false);
      return showToast(error?.message || "Couldn't create the list.");
    }
    // The lead you opened this from goes straight into the new list.
    const added = await addToList(data.id, lead.id);
    setBusy(false);
    setLists((p) => [...p, data]);
    setNewName("");
    if (!added.error) {
      const next = new Set(member).add(data.id);
      setMember(next);
      report(next);
    }
  }

  async function saveName(list) {
    const draft = editing[list.id];
    if (draft === undefined || draft.trim() === list.name) return setEditing(({ [list.id]: _, ...rest }) => rest);
    const { error } = await renameList(list.id, draft, lists);
    if (error) return showToast(error.message);
    setLists((p) => p.map((l) => (l.id === list.id ? { ...l, name: draft.trim() } : l)));
    setEditing(({ [list.id]: _, ...rest }) => rest);
    report(member);
  }

  async function remove(list) {
    const { error } = await deleteList(list.id);
    if (error) return showToast("Couldn't delete the list.");
    const next = new Set(member);
    next.delete(list.id);
    setLists((p) => p.filter((l) => l.id !== list.id));
    setMember(next);
    setConfirmDel(null);
    report(next);
    showToast(`Deleted "${list.name}". The leads themselves are untouched.`);
  }

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} maxWidth="max-w-md">
      <SheetHeader title="Add to a list" sub={lead.name} />

      {!loaded ? (
        <div className="py-8 text-center text-sm text-ink/40">Loading…</div>
      ) : (
        <>
          {lists.length === 0 ? (
            <p className="mb-4 rounded-2xl bg-white p-4 text-[13px] leading-relaxed text-ink/60">
              Lists are your own shortlists, like "Hot prospects" or "Call back Monday". Only you can see them. Make your first one below.
            </p>
          ) : (
            <div className="space-y-2">
              {lists.map((l) => {
                const on = member.has(l.id);
                const draft = editing[l.id];
                return (
                  <div key={l.id} className="flex items-center gap-2">
                    {manage ? (
                      <div className="flex min-h-[52px] flex-1 items-center gap-2 rounded-2xl border border-[#EADFCB] bg-white px-3">
                        <Star className="h-4 w-4 shrink-0" style={{ color: l.color, fill: l.color }} />
                        <input
                          value={draft ?? l.name}
                          maxLength={MAX_NAME}
                          onChange={(e) => setEditing((p) => ({ ...p, [l.id]: e.target.value }))}
                          onBlur={() => saveName(l)}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          aria-label={`Rename ${l.name}`}
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none"
                        />
                        <Pencil className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                      </div>
                    ) : (
                      <button
                        onClick={() => toggle(l)}
                        aria-pressed={on}
                        className={`flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl border px-3.5 text-left transition-all active:scale-[0.99] ${on ? "border-ink bg-white" : "border-[#EADFCB] bg-[#FEFCFA]"}`}
                      >
                        <Star className="h-[18px] w-[18px] shrink-0" style={{ color: l.color, fill: on ? l.color : "none" }} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{l.name}</span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${on ? "bg-ink text-cream" : "border border-[#E0D3BE]"}`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    )}
                    {manage && (
                      confirmDel === l.id ? (
                        <button onClick={() => remove(l)} className="min-h-[44px] shrink-0 rounded-full bg-red-600 px-3.5 text-xs font-semibold text-white active:scale-95">Delete?</button>
                      ) : (
                        <button onClick={() => setConfirmDel(l.id)} aria-label={`Delete ${l.name}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 active:scale-90">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!manage && lists.length < MAX_LISTS && (
            <form onSubmit={create} className="mt-4 flex gap-2">
              <input
                value={newName}
                maxLength={MAX_NAME}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={lists.length === 0 ? `e.g. ${DEFAULT_LIST_NAME}` : "New list, e.g. Hot prospects"}
                aria-label="New list name"
                className="min-h-[48px] min-w-0 flex-1 rounded-2xl border border-[#EADFCB] bg-[#FEFCFA] px-4 text-sm font-medium text-ink outline-none placeholder:text-ink/35 focus:border-stone-400"
              />
              <button type="submit" disabled={busy} className="inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-2xl bg-ink px-4 text-sm font-semibold text-cream active:scale-95 disabled:opacity-60">
                <Plus className="h-4 w-4" /> Create
              </button>
            </form>
          )}

          <div className="mt-5 flex items-center justify-between">
            {lists.length > 0 ? (
              <button onClick={() => { setManage((m) => !m); setConfirmDel(null); }} className="min-h-[44px] text-[13px] font-semibold text-ink/55">
                {manage ? "Finish editing" : "Rename or delete lists"}
              </button>
            ) : <span />}
            <button onClick={onClose} className="min-h-[44px] rounded-full bg-stone-600 px-6 text-sm font-semibold text-sand active:scale-95">Done</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
