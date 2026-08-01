export function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet">
        <div className="modal-handle" />
        {children}
      </div>
    </div>
  );
}

export function ModalHero({ icon, title, sub }) {
  return (
    <div className="modal-hero">
      {icon && <div className="modal-icon">{icon}</div>}
      <div className="modal-title">{title}</div>
      {sub && <div className="modal-sub">{sub}</div>}
    </div>
  );
}
