import type { ReactNode } from "react";

/**
 * Estado vacio. Pensado para no dejar pantallas en blanco: explica
 * que falta y, si aplica, ofrece la accion inmediata. No usa emojis.
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center"
    >
      {icon ? (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-on-surface-faint)]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-[var(--color-on-surface)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-on-surface-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
