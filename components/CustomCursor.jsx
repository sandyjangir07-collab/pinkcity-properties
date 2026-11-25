"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [label, setLabel] = useState("");
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 400, damping: 35, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 400, damping: 35, mass: 0.4 });
  const dotX = useSpring(x, { stiffness: 1000, damping: 50 });
  const dotY = useSpring(y, { stiffness: 1000, damping: 50 });

  useEffect(() => {
    const isFine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!isFine || reduced) return;
    setEnabled(true);

    function onMove(e) {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target.closest("a, button, [data-cursor]");
      if (target) {
        setHovering(true);
        setLabel(target.dataset.cursor || "");
      } else {
        setHovering(false);
        setLabel("");
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 z-[100] pointer-events-none rounded-full bg-stone-600"
        style={{ x: dotX, y: dotY, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: hovering ? 0 : 6, height: hovering ? 0 : 6 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="fixed top-0 left-0 z-[100] pointer-events-none rounded-full border border-stone-600/50 flex items-center justify-center"
        style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: hovering ? (label ? 76 : 46) : 26,
          height: hovering ? (label ? 76 : 46) : 26,
          backgroundColor: hovering ? "rgba(196,56,104,0.06)" : "rgba(196,56,104,0)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {label && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-semibold text-stone-600 uppercase tracking-wide">
            {label}
          </motion.span>
        )}
      </motion.div>
      <style jsx global>{`
        @media (pointer: fine) {
          a, button { cursor: none !important; }
        }
      `}</style>
    </>
  );
}
