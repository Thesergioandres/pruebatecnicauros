"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ListTicketsResult, TicketSortField, SortOrder } from "@/domain/tickets.js";
import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "@soporte/shared";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { FormError } from "../ui/FormError.js";
import { Pagination } from "../ui/Pagination.js";
import { TicketFilters, EMPTY_FILTER, type TicketFilterValue } from "./TicketFilters.js";
import { TicketTable } from "./TicketTable.js";

const PAGE_SIZE = 10;

export interface TicketsListClientProps {
  initialFilter?: Partial<TicketFilterValue>;
  initialPage?: number;
}

function buildQuery(filter: TicketFilterValue, page: number) {
  return {
    filter: {
      ...(filter.search.trim() ? { search: filter.search.trim() } : {}),
      ...(filter.status ? { status: filter.status as TicketStatus } : {}),
      ...(filter.priority ? { priority: filter.priority as TicketPriority } : {}),
      ...(filter.category ? { category: filter.category as TicketCategory } : {}),
    },
    sort: {
      field: filter.sortBy as TicketSortField,
      order: filter.sortOrder as SortOrder,
    },
    pagination: { page, pageSize: PAGE_SIZE },
  };
}

export function TicketsListClient({ initialFilter, initialPage = 1 }: TicketsListClientProps) {
  const { session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  const [filter, setFilter] = useState<TicketFilterValue>({ ...EMPTY_FILTER, ...initialFilter });
  const [applied, setApplied] = useState<{ filter: TicketFilterValue; page: number }>({
    filter: { ...EMPTY_FILTER, ...initialFilter },
    page: initialPage,
  });
  const [result, setResult] = useState<ListTicketsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El cliente solo ve sus propios tickets; el admin ve todos. El
  // filtro por rol se aplica a nivel de query para que la paginacion
  // refleje el total real del solicitante y no del global.
  const query = useMemo(() => {
    const base = buildQuery(applied.filter, applied.page);
    if (isAdmin || !session) return base;
    return {
      ...base,
      filter: { ...base.filter, requesterId: session.user.id },
    };
  }, [applied, isAdmin, session]);

  const load = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketContainer.list.execute(query);
      if (signal.aborted) return;
      setResult(data);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError("No pudimos cargar las solicitudes. Intenta de nuevo.");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function handleApply() {
    setApplied({ filter, page: 1 });
  }

  function handleReset() {
    setFilter(EMPTY_FILTER);
    setApplied({ filter: EMPTY_FILTER, page: 1 });
  }

  function handlePageChange(next: number) {
    setApplied((prev) => ({ ...prev, page: next }));
  }

  const tickets: Ticket[] = result?.items ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">
            {isAdmin ? "Todas las solicitudes" : "Mis solicitudes"}
          </h1>
          <p className="text-sm text-[--color-text-muted]">
            {isAdmin
              ? "Busca, filtra y revisa el estado de las solicitudes de toda la plataforma."
              : "Busca, filtra y revisa el estado de tus solicitudes de soporte."}
          </p>
        </div>
        <Link href="/tickets/new">
          <Button>Nueva solicitud</Button>
        </Link>
      </header>

      <TicketFilters
        value={filter}
        onChange={setFilter}
        onReset={handleReset}
        onApply={handleApply}
        isLoading={isLoading}
      />

      <FormError message={error} />

      <div aria-busy={isLoading} aria-live="polite" className="space-y-3">
        {isLoading && !result ? (
          <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-10 text-center text-sm text-[--color-text-muted]">
            Cargando solicitudes…
          </div>
        ) : (
          <>
            <TicketTable tickets={tickets} />
            {result ? (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                pageSize={result.pageSize}
                onPageChange={handlePageChange}
                label="solicitudes"
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
