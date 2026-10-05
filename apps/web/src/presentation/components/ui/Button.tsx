import { forwardRef } from "react";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  loadingLabel?: string;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[--color-brand-600] text-white hover:bg-[--color-brand-700] focus-visible:outline-[--color-brand-600]",
  secondary:
    "bg-white text-[--color-text] border border-[--color-border] hover:bg-[--color-surface-muted] focus-visible:outline-[--color-brand-500]",
  ghost:
    "bg-transparent text-[--color-brand-700] hover:bg-[--color-brand-50] focus-visible:outline-[--color-brand-500]",
  danger:
    "bg-[--color-danger-700] text-white hover:opacity-90 focus-visible:outline-[--color-danger-700]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    type = "button",
    isLoading = false,
    loadingLabel,
    disabled,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  const computedClassName = [BASE, VARIANTS[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={computedClassName}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <>
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span>{loadingLabel ?? "Cargando…"}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
