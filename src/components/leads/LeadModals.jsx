import { useState } from "react";
import LeadDetailModal from "./LeadDetailModal";
import LeadFormModal from "./LeadFormModal";
import ScheduleVisitModal from "./ScheduleVisitModal";
import ScheduleCallModal from "./ScheduleCallModal";

// Open any lead from anywhere (a visit, a task…) with the same full screen the Leads
// page uses: details, every note, transfer, and the edit / visit / call actions.
export default function LeadModals({ leadId, onClose, onChanged }) {
  const [formTarget, setFormTarget] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);
  return (
    <>
      <LeadFormModal target={formTarget} onClose={() => setFormTarget(null)} onSaved={() => { setFormTarget(null); onChanged(); }} />
      <LeadDetailModal
        leadId={leadId}
        onClose={onClose}
        onChanged={onChanged}
        onEdit={(id) => { onClose(); setFormTarget(id); }}
        onScheduleVisit={(t) => setVisitTarget(t)}
        onScheduleCall={(t) => setCallTarget(t)}
        onDeleted={() => { onClose(); onChanged(); }}
      />
      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); onChanged(); }} />
      <ScheduleCallModal target={callTarget} onClose={() => setCallTarget(null)} onSaved={() => setCallTarget(null)} />
    </>
  );
}
