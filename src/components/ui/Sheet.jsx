import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

export function Sheet({ open, onClose, children, maxWidth = "max-w-sm" }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={`relative w-full ${maxWidth} bg-sand rounded-t-3xl sm:rounded-3xl p-7 pt-14 max-h-[90vh] overflow-y-auto`}
          >
            <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto absolute top-2.5 left-1/2 -translate-x-1/2 sm:hidden" />
            <button
              onClick={onClose}
              aria-label="Back"
              className="absolute top-4 left-4 w-9 h-9 rounded-full border border-ink/10 bg-white flex items-center justify-center text-ink/60 hover:text-ink hover:border-ink/20 transition-colors active:scale-90"
            >
              <ChevronLeft className="w-[18px] h-[18px]" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SheetHeader({ title, sub }) {
  return (
    <>
      <h3 className="font-display text-2xl text-ink mb-1.5">{title}</h3>
      {sub && <p className="text-sm text-ink/50 mb-6">{sub}</p>}
    </>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
