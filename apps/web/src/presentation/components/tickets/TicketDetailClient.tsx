"use client";

import {
  TICKET_CATEGORY_LABELS,
  type Ticket,
} from "@soporte/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { FormError } from "../ui/FormError.js";
import { CancelForm } from "./CancelForm.js";
import { DeleteTicketForm } from "./DeleteTicketForm.js";
import { HistoryList } from "./HistoryList.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { StatusBadge } from "./StatusBadge.js";
import { StatusChangeForm } from "./StatusChangeForm.js";

export interface TicketDetailClientProps {
  ticketId: string;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export function TicketDetailClient({ ticketId }: TicketDetailClientProps) {
  const { session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketContainer.get.execute(ticketId);
      if (signal.aborted) return;
      setTicket(data);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError("No pudimos cargar la solicitud.");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [ticketId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (isLoading) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="rounded-md border border-[--color-border] bg-[--color-surface] p-10 text-center text-sm text-[--color-text-muted]"
      >
        Cargando solicitud…
      </p>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-3">
        <FormError message={error ?? "Solicitud no encontrada."} />
        <Link href="/tickets" className="text-sm font-semibold text-[--color-brand-700] underline-offset-2 hover:underline">
          ← Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-brand-700]">
            {TICKET_CATEGORY_LABELS[ticket.category]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[--color-text]">{ticket.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs text-[--color-text-muted]">
              Creada {formatDateTime(ticket.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tickets">
            <Button variant="secondary">← Volver al listado</Button>
          </Link>
          <Link href={`/tickets/${ticket.id}/edit`}>
            <Button variant="secondary">Editar</Button>
          </Link>
        </div>
      </header>

      <section
        aria-label="Descripción"
        className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5 text-sm leading-relaxed text-[--color-text]"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">
          Descripción
        </h2>
        <p className="mt-2 whitespace-pre-wrap">{ticket.description}</p>
      </section>

      <section
        aria-label="Detalles"
        className="grid gap-3 rounded-lg border border-[--color-border] bg-[--color-surface] p-5 text-sm sm:grid-cols-2"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">Solicitante</p>
          <p className="mt-1 font-medium text-[--color-text]">{ticket.requester.name}</p>
          <p className="text-xs text-[--color-text-muted]">{ticket.requester.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">Responsable</p>
          {ticket.assignedTo ? (
            <>
              <p className="mt-1 font-medium text-[--color-text]">{ticket.assignedTo.name}</p>
              <p className="text-xs text-[--color-text-muted]">{ticket.assignedTo.email}</p>
            </>
          ) : (
            <p className="mt-1 text-[--color-text-muted]">Sin asignar</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">Última actualización</p>
          <p className="mt-1 text-[--color-text]">{formatDateTime(ticket.updatedAt)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[--color-text-muted]">Resuelta</p>
          <p className="mt-1 text-[--color-text]">{formatDateTime(ticket.resolvedAt)}</p>
        </div>
      </section>

      <section aria-label="Acciones" className="grid gap-3 lg:grid-cols-2">
        <StatusChangeForm ticket={ticket} />
        <CancelForm ticket={ticket} />
      </section>

      {isAdmin ? (
        <section aria-label="Acciones de administrador" className="space-y-3">
          <h2 className="text-base font-semibold text-[--color-text]">Acciones de administrador</h2>
          <DeleteTicketForm ticket={ticket} />
        </section>
      ) : null}

      <section aria-label="Historial" className="space-y-3">
        <h2 className="text-base font-semibold text-[--color-text]">Historial de cambios</h2>
        <HistoryList ticketId={ticket.id} />
      </section>
    </div>
  );
}
