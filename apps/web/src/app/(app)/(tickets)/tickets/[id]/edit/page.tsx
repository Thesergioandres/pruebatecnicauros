"use client";

import { ticketContainer } from "@/infrastructure/container.js";
import { HttpError } from "@/infrastructure/http-client.js";
import { TicketForm } from "@/presentation/components/tickets/TicketForm.js";
import { useEffect, useState } from "react";

import type { Ticket } from "@soporte/shared";

import { FormError } from "@/presentation/components/ui/FormError.js";

export default function EditTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EditTicketLoader params={params} />;
}

function EditTicketLoader({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void params.then(({ id: ticketId }) => {
      setId(ticketId);
      void ticketContainer.get.execute(ticketId).then((data: Ticket | null) => {
        if (cancelled) return;
        if (!data) {
          setError("Solicitud no encontrada.");
          setIsLoading(false);
          return;
        }
        setTicket(data);
        setIsLoading(false);
      }).catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof HttpError) {
          setError(err.message);
        } else {
          setError("No pudimos cargar la solicitud para editar.");
        }
        setIsLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

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
  if (error || !ticket || !id) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <FormError message={error ?? "Solicitud no encontrada."} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <TicketForm
        mode="edit"
        ticketId={id}
        initialValues={{
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          assignedToId: ticket.assignedTo?.id ?? "",
        }}
      />
    </div>
  );
}
