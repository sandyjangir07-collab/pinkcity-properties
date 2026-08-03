import { useRef, useState } from "react";
import { motion } from "framer-motion";

export default function Magnetic({ children, strength = 0.35 }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function onMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    setPos({ x: relX * strength, y: relY * strength });
  }

  function onMouseLeave() {
    setPos({ x: 0, y: 0 });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.2 }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}
