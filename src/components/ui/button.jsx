import { motion } from "framer-motion";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-br from-stone-500 to-stone-700 text-sand shadow-[0_8px_24px_-8px_rgba(196,56,104,0.55)]",
        outline: "border border-ink/15 text-ink hover:border-ink/30 bg-transparent",
        ghost: "text-ink/70 hover:text-ink",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-xs",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export function Button({ className, variant, size, as = "button", ...props }) {
  const Comp = motion[as] || motion.button;
  return (
    <Comp
      whileHover={{ scale: 1.025, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
