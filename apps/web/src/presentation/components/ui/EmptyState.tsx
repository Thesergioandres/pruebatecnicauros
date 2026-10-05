import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="rounded-lg border border-dashed border-[--color-border] bg-[--color-surface] px-6 py-10 text-center"
    >
      <p className="text-base font-semibold text-[--color-text]">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-[--color-text-muted]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
