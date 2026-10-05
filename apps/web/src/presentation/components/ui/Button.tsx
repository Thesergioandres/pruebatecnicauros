import { forwardRef } from "react";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Boton primario del sistema. Variantes:
 *  - primary   : fondo brand, texto blanco (uso principal)
 *  - secondary : fondo surface, borde hairline, hover sutil
 *  - ghost     : sin chrome, hover ligero (uso terciario)
 *  - danger    : fondo critical, texto blanco (acciones destructivas)
 *
 * Alturas segun densidad: `sm` 32px (tablas), `md` 36px (default),
 * `lg` 44px (formularios). Todas cumplen minimo 44px de hit area en
 * mobile via padding + texto.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[--color-brand-500] text-white hover:bg-[--color-brand-600] focus-visible:outline-[--color-brand-500] shadow-sm",
  secondary:
    "bg-[--color-surface] text-[--color-on-surface] border border-[--color-border] hover:bg-[--color-surface-muted] focus-visible:outline-[--color-brand-500]",
  ghost:
    "bg-transparent text-[--color-on-surface-muted] hover:bg-[--color-surface-muted] hover:text-[--color-on-surface] focus-visible:outline-[--color-brand-500]",
  danger:
    "bg-[--color-critical] text-white hover:opacity-90 focus-visible:outline-[--color-critical]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
  lg: "h-11 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    type = "button",
    isLoading = false,
    loadingLabel,
    disabled,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || isLoading;
  const computedClassName = [BASE, VARIANTS[variant], SIZES[size], className]
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
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
          <span>{loadingLabel ?? "Cargando..."}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
