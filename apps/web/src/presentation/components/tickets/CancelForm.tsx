"use client";

import { TICKET_STATUS_LABELS, isTerminalStatus, type Ticket } from "@soporte/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { FormError } from "../ui/FormError.js";
import { Textarea } from "../ui/Textarea.js";

export interface CancelFormProps {
  ticket: Ticket;
}

export function CancelForm({ ticket }: CancelFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const [observation, setObservation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isTerminalStatus(ticket.status)) {
    return null;
  }

  if (ticket.status === "CANCELADA") {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!session) {
      setFormError("Necesitas iniciar sesión para cancelar la solicitud.");
      return;
    }
    setIsSubmitting(true);
    try {
      await ticketContainer.cancel.execute(
        ticket.id,
        observation.trim() || undefined,
        {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
      );
      setObservation("");
      router.refresh();
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
      } else {
        setFormError("No pudimos cancelar la solicitud. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-3 rounded-lg border border-[--color-danger-200] bg-[--color-danger-50]/40 p-4"
      aria-label="Cancelar solicitud"
    >
      <header>
        <h3 className="text-sm font-semibold text-[--color-text]">Cancelar solicitud</h3>
        <p className="text-xs text-[--color-text-muted]">
          Pasa la solicitud a {TICKET_STATUS_LABELS.CANCELADA} (estado terminal). Añade una observación si aplica.
        </p>
      </header>
      <Textarea
        label="Motivo"
        name="cancelObservation"
        value={observation}
        onChange={setObservation}
        rows={3}
        maxLength={500}
        disabled={isSubmitting}
      />
      <FormError message={formError} />
      <div className="flex justify-end">
        <Button type="submit" variant="danger" isLoading={isSubmitting}>
          Confirmar cancelación
        </Button>
      </div>
    </form>
  );
}
