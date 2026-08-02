"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { TimerMode } from "@/types/timer.types";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Overrides `variant="primary"`'s background with the current timer mode's accent -- doc 08 section 2. */
  accent?: TimerMode;
}

/** Mode-accent backgrounds, written as literal Tailwind arbitrary-value classes so the JIT scanner picks them up regardless of which branch runs at runtime. */
const ACCENT_CLASSES: Record<TimerMode, string> = {
  focus: "bg-[var(--focus)] text-white dark:text-[#0f1115] focus-visible:ring-[var(--focus)]",
  short_break: "bg-[var(--short-break)] text-white dark:text-[#0f1115] focus-visible:ring-[var(--short-break)]",
  long_break: "bg-[var(--long-break)] text-white dark:text-[#0f1115] focus-visible:ring-[var(--long-break)]",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-focus text-white focus-visible:ring-focus hover:opacity-90",
  secondary:
    "bg-surface-soft text-text-primary border border-border hover:bg-border/40 focus-visible:ring-border",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-soft focus-visible:ring-border",
  danger: "bg-danger text-white focus-visible:ring-danger hover:opacity-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-6 py-3 text-base gap-2",
  sm: "px-4 py-2 text-sm gap-1.5",
};

/**
 * Shared button primitive: pill radius + 44px min touch target (`.control`,
 * doc 08 sections 3/5), visible `focus-visible` ring (doc 08 section 20),
 * and semantic `<button>` throughout so every control stays keyboard- and
 * screen-reader-operable without each feature component re-deriving these
 * rules on its own.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", accent, className, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "control inline-flex items-center justify-center rounded-pill font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SIZE_CLASSES[size],
        accent && variant === "primary" ? ACCENT_CLASSES[accent] : VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
});
