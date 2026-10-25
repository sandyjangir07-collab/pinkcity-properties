import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { sb } from "../../lib/supabase";
import { initials } from "../../lib/utils";
import { Card, SectionTitle } from "../ui/primitives";
import { Sheet, SheetHeader } from "../ui/Sheet";
import { useToast } from "../../hooks/useToast";

export default function HierarchySection({ employee, isAdmin, canEdit, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [requestMode, setRequestMode] = useState(null); // "senior" | "associate" | null
  const [removeTarget, setRemoveTarget] = useState(null); // { rowId, name, kind }
  const [removing, setRemoving] = useState(false);
  const showToast = useToast();

  async function load() {
    const { data } = await sb
      .from("employee_hierarchy")
      .select("*")
      .or(`junior_id.eq.${employee.id},senior_id.eq.${employee.id}`);
    const list = data || [];
    setRows(list);
    const otherIds = Array.from(
      new Set(list.map((r) => (r.junior_id === employee.id ? r.senior_id : r.junior_id)))
    );
    if (otherIds.length) {
      const { data: resolved } = await sb.rpc("get_hierarchy_names", { p_ids: otherIds });
      const byId = Object.fromEntries((resolved || []).map((r) => [r.id, r]));
      setNames(byId);
    } else {
      setNames({});
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, refreshKey]);

  const seniors = rows.filter((r) => r.junior_id === employee.id && r.status === "approved");
  const associates = rows.filter((r) => r.senior_id === employee.id && r.status === "approved");
  const pending = rows.filter((r) => r.status === "pending");

  async function respond(requestId, approve) {
    const { error } = await sb.rpc("respond_hierarchy_request", { p_request_id: requestId, p_approve: approve });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(approve ? "Hierarchy request approved." : "Hierarchy request rejected.");
    load();
  }

  // Admin only: take a reporting line away (the database enforces this too).
  async function removeLink() {
    if (!removeTarget) return;
    setRemoving(true);
    const { error } = await sb.rpc("remove_hierarchy_link", { p_id: removeTarget.rowId });
    setRemoving(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setRemoveTarget(null);
    showToast("✓ Removed. Both of them have been told.");
    load();
  }

  return (
    <Card>
      <SectionTitle
        action={
          canEdit && (
            <div className="flex gap-2">
              <button onClick={() => setRequestMode("senior")} className="text-xs font-medium text-stone-600 border border-stone-200 rounded-full px-3 py-1.5">+ Senior</button>
              <button onClick={() => setRequestMode("associate")} className="text-xs font-medium text-stone-600 border border-stone-200 rounded-full px-3 py-1.5">+ Associate</button>
            </div>
          )
        }
      >
        Hierarchy
      </SectionTitle>

      <PersonList
        title="Senior"
        items={seniors.map((r) => ({ person: names[r.senior_id], rowId: r.id }))}
        canRemove={isAdmin}
        onRemove={(it) => setRemoveTarget({ rowId: it.rowId, name: it.person.full_name, kind: "senior" })}
      />
      <PersonList
        title="Associates"
        items={associates.map((r) => ({ person: names[r.junior_id], rowId: r.id }))}
        canRemove={isAdmin}
        onRemove={(it) => setRemoveTarget({ rowId: it.rowId, name: it.person.full_name, kind: "associate" })}
      />
      {!isAdmin && (seniors.length > 0 || associates.length > 0) && (
        <p className="text-[11.5px] text-ink/35">To remove someone from this list, ask the admin.</p>
      )}

      {pending.length > 0 && isAdmin && (
        <>
          <div className="h-px bg-ink/[0.06] my-4" />
          <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Pending Requests</div>
          <div className="space-y-2">
            {pending.map((r) => {
              const other = names[r.junior_id === employee.id ? r.senior_id : r.junior_id];
              const asSenior = r.junior_id === employee.id;
              return (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="text-sm text-ink">{other?.full_name || "Unknown"} as {asSenior ? "senior" : "associate"}</div>
                  <div className="flex gap-1.5">
                    <button onClick={() => respond(r.id, true)} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </button>
                    <button onClick={() => respond(r.id, false)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Sheet open={!!removeTarget} onClose={() => !removing && setRemoveTarget(null)}>
        {removeTarget && (
          <>
            <SheetHeader
              title={removeTarget.kind === "senior" ? `Remove ${removeTarget.name} as senior?` : `Remove ${removeTarget.name} from the associates?`}
              sub={
                removeTarget.kind === "senior"
                  ? `${employee.full_name} will no longer report to ${removeTarget.name}. You can add a different senior afterwards.`
                  : `${removeTarget.name} will no longer be listed under ${employee.full_name} and will move back to the top of the Team page, unless they report to someone else.`
              }
            />
            <button
              onClick={removeLink}
              disabled={removing}
              className="min-h-[50px] w-full rounded-full border border-red-200 bg-red-50 text-[14.5px] font-semibold text-red-600 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Yes, remove"}
            </button>
            <button onClick={() => setRemoveTarget(null)} disabled={removing} className="mt-3 min-h-[50px] w-full rounded-full border border-ink/10 text-[14px] font-medium text-ink/60">
              Cancel
            </button>
          </>
        )}
      </Sheet>

      <RequestLinkModal
        mode={requestMode}
        onClose={() => setRequestMode(null)}
        employeeId={employee.id}
        onSent={() => {
          setRequestMode(null);
          showToast("Request sent — waiting for admin approval.");
          load();
        }}
      />
    </Card>
  );
}

function PersonList({ title, items, canRemove, onRemove }) {
  const valid = items.filter((it) => it.person);
  return (
    <div className="mb-3">
      <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2 mt-3">{title}</div>
      {valid.length === 0 && <div className="text-sm text-ink/35">None</div>}
      <div className="space-y-1">
        {valid.map(({ person: p, rowId }) => (
          <div key={rowId} className="-mx-2 flex items-center gap-1 rounded-xl px-2 hover:bg-ink/[0.03]">
            <Link to={`/employees/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2">
              <div className="w-9 h-9 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : initials(p.full_name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{p.full_name}</div>
                <div className="truncate text-xs text-ink/40">{p.designation || "—"}</div>
              </div>
            </Link>
            {canRemove && (
              <button
                onClick={() => onRemove({ person: p, rowId })}
                aria-label={`Remove ${p.full_name}`}
                title="Remove"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/35 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestLinkModal({ mode, onClose, employeeId, onSent }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (!mode) {
      setQuery("");
      setResults([]);
    }
  }, [mode]);

  useEffect(() => {
    if (!mode || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await sb.rpc("search_employees_directory", { p_query: query.trim() });
      setResults((data || []).filter((r) => r.id !== employeeId));
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode, employeeId]);

  async function pick(targetId) {
    setBusy(true);
    const { error } = await sb.rpc("request_hierarchy_link", {
      p_employee_id: employeeId,
      p_target_employee_id: targetId,
      p_as_senior: mode === "senior",
    });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    onSent();
  }

  return (
    <Sheet open={!!mode} onClose={onClose}>
      <SheetHeader
        title={mode === "senior" ? "Request a Senior" : "Add an Associate"}
        sub="Search the team directory — this needs admin approval before it takes effect."
      />
      <input className="field-input mb-3" placeholder="Search by name…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="space-y-1">
        {results.map((r) => (
          <div key={r.id} onClick={() => !busy && pick(r.id)} className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-xl hover:bg-ink/[0.03] cursor-pointer">
            <div className="w-9 h-9 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
              {r.photo_url ? <img src={r.photo_url} alt="" className="w-full h-full object-cover" /> : initials(r.full_name)}
            </div>
            <div>
              <div className="text-sm font-medium text-ink">{r.full_name}</div>
              <div className="text-xs text-ink/40">{r.designation || "—"}</div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
