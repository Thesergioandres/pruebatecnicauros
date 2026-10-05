"use client";

import {
  TICKET_STATUS_LABELS,
  canTransition,
  isTerminalStatus,
  type Ticket,
  type TicketStatus,
} from "@soporte/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { FormError } from "../ui/FormError.js";
import { Select } from "../ui/Select.js";
import { Textarea } from "../ui/Textarea.js";

const TRANSITION_HINT: Record<TicketStatus, string> = {
  PENDIENTE: "Vuelve la solicitud a la cola inicial.",
  EN_PROGRESO: "Indica que ya se está trabajando en la solicitud.",
  RESUELTA: "Marca la solicitud como resuelta. Si es crítica, la observación es obligatoria.",
  CANCELADA: "Cancela la solicitud de forma definitiva.",
};

export interface StatusChangeFormProps {
  ticket: Ticket;
}

export function StatusChangeForm({ ticket }: StatusChangeFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const [nextStatus, setNextStatus] = useState<TicketStatus | "">("");
  const [observation, setObservation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isTerminalStatus(ticket.status)) {
    return (
      <p className="rounded-md border border-[--color-border] bg-[--color-surface-muted] px-3 py-2 text-sm text-[--color-text-muted]">
        Esta solicitud está en estado terminal ({TICKET_STATUS_LABELS[ticket.status]}) y no admite más cambios.
      </p>
    );
  }

  const transiciones: TicketStatus[] = (
    ["PENDIENTE", "EN_PROGRESO", "RESUELTA", "CANCELADA"] as TicketStatus[]
  ).filter((target) => target !== ticket.status && canTransition(ticket.status, target));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldError(null);

    if (!nextStatus) {
      setFieldError("Selecciona el estado al que transicionar.");
      return;
    }
    if (!session) {
      setFormError("Necesitas iniciar sesión para cambiar el estado.");
      return;
    }

    setIsSubmitting(true);
    try {
      await ticketContainer.changeStatus.execute(
        ticket.id,
        nextStatus,
        observation.trim() || undefined,
        {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
      );
      setNextStatus("");
      setObservation("");
      router.refresh();
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
        if (err.details && err.details[0]) {
          setFieldError(err.details[0].message);
        }
      } else {
        setFormError("No pudimos cambiar el estado. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-3 rounded-lg border border-[--color-border] bg-[--color-surface] p-4"
      aria-label="Cambiar estado de la solicitud"
    >
      <Select
        label="Cambiar a"
        name="nextStatus"
        value={nextStatus}
        onChange={(v) => setNextStatus(v as TicketStatus)}
        placeholder="Selecciona un estado"
        options={transiciones.map((value) => ({ value, label: TICKET_STATUS_LABELS[value] }))}
        error={fieldError ?? undefined}
        disabled={isSubmitting}
      />
      <Textarea
        label="Observación"
        name="observation"
        value={observation}
        onChange={setObservation}
        rows={3}
        maxLength={500}
        hint={nextStatus ? TRANSITION_HINT[nextStatus] : "Opcional. Obligatoria al resolver una solicitud crítica."}
        disabled={isSubmitting}
      />
      <FormError message={formError} />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} disabled={!nextStatus}>
          Cambiar estado
        </Button>
      </div>
    </form>
  );
}
