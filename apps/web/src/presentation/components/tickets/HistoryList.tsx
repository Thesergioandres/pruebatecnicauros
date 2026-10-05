"use client";

import {
  TICKET_STATUS_LABELS,
  type TicketHistoryEntry,
} from "@soporte/shared";
import { useCallback, useEffect, useState } from "react";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { FormError } from "../ui/FormError.js";
import { Pagination } from "../ui/Pagination.js";

const PAGE_SIZE = 10;

export interface HistoryListProps {
  ticketId: string;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function HistoryList({ ticketId }: HistoryListProps) {
  const [items, setItems] = useState<TicketHistoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketContainer.history.execute(ticketId, { page, pageSize: PAGE_SIZE });
      if (signal.aborted) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError("No pudimos cargar el historial.");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [ticketId, page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section aria-label="Historial de cambios" className="space-y-3">
      <FormError message={error} />
      {isLoading ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md border border-[--color-border] bg-[--color-surface] p-6 text-center text-sm text-[--color-text-muted]"
        >
          Cargando historial…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-[--color-border] bg-[--color-surface] p-6 text-center text-sm text-[--color-text-muted]">
          Aún no hay cambios registrados.
        </p>
      ) : (
        <ol className="space-y-3">
          {items.map((entry) => {
            const desde = entry.previousStatus ? TICKET_STATUS_LABELS[entry.previousStatus] : "Inicio";
            const hasta = TICKET_STATUS_LABELS[entry.newStatus];
            return (
              <li
                key={entry.id}
                className="rounded-md border border-[--color-border] bg-[--color-surface] p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[--color-text]">
                    {desde} → {hasta}
                  </p>
                  <time dateTime={entry.createdAt} className="text-xs text-[--color-text-muted]">
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-[--color-text-muted]">
                  Por <span className="font-medium text-[--color-text]">{entry.changedBy.name}</span>
                </p>
                {entry.observation ? (
                  <p className="mt-2 rounded-md bg-[--color-surface-muted] p-2 text-sm text-[--color-text]">
                    {entry.observation}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {total > 0 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label="cambios"
        />
      ) : null}
    </section>
  );
}
