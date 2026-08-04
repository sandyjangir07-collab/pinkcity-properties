import { motion } from "framer-motion";

export function BrandedLoader({ size = 28 }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.12, 1], opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      className="rounded-full bg-stone-600 flex items-center justify-center p-1.5"
      style={{ width: size, height: size }}
    >
      <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
    </motion.div>
  );
}
