import type { ReactNode } from "react";

/**
 * Badge / Status pill. Tokens semanticos:
 *  - critical (rose)  - estado de error o atencion inmediata
 *  - high     (orange) - prioridad alta, advertencia
 *  - medium   (amber)  - prioridad media
 *  - info     (blue)   - en transito, informativo
 *  - success  (emerald) - completado, ok
 *  - neutral  (slate)  - inactivo, pendiente
 *
 * Todos los badges son uppercase + tracking 0.04em + peso 600, siguiendo
 * el sistema de etiquetas tipo `label-sm` del design system. El radio
 * es `9999px` (pill) para diferenciar meta-indicadores de controles
 * cuadrados cliqueables.
 */

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "critical"
  | "high"
  | "medium";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral:
    "bg-[var(--color-neutral-bg)] text-[var(--color-on-surface-muted)] border-[var(--color-neutral-border)]",
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]",
  success:
    "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]",
  warning:
    "bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]",
  danger:
    "bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]",
  critical:
    "bg-[var(--color-critical-bg)] text-[var(--color-critical)] border-[var(--color-critical-border)]",
  high: "bg-[var(--color-high-bg)] text-[var(--color-high)] border-[var(--color-high-border)]",
  medium:
    "bg-[var(--color-medium-bg)] text-[var(--color-medium)] border-[var(--color-medium-border)]",
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

export function Badge({
  tone = "neutral",
  children,
  className,
  pulse = false,
  size = "md",
}: BadgeProps) {
  const sizeClass = size === "sm" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-[11px]";
  const computed = [
    "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap",
    sizeClass,
    TONE_CLASS[tone],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={computed}>
      {pulse ? (
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full bg-current ${tone === "critical" || tone === "danger" ? "animate-ping" : "animate-pulse"}`}
        />
      ) : null}
      {children}
    </span>
  );
}
