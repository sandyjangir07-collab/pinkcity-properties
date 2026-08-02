import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-stone-600 text-sand hover:bg-stone-700 shadow-[0_8px_24px_-8px_rgba(196,56,104,0.5)]",
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

export function Button({ className, variant, size, as: Comp = "button", ...props }) {
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
