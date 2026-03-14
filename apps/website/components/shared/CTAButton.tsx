import { cn } from "@/lib/utils";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface CTAButtonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-green text-white hover:bg-green/90 shadow-lg focus-visible:ring-green",
  secondary:
    "bg-navy text-white hover:bg-navy-light focus-visible:ring-navy",
  ghost:
    "border border-border text-ink hover:bg-surface focus-visible:ring-border",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-sm px-4 py-2",
  md: "text-base px-6 py-2.5",
  lg: "text-lg px-8 py-3.5",
};

export default function CTAButton({
  variant = "primary",
  size = "md",
  children,
  href,
  onClick,
  className,
  type = "button",
}: CTAButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium",
    "transition-colors duration-200 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "cursor-pointer select-none whitespace-nowrap",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
