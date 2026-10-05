"use client";

import { isTerminalStatus, type Ticket } from "@soporte/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { FormError } from "../ui/FormError.js";

/**
 * Soft delete. Solo lo ven administradores. Tras eliminar, redirige al
 * listado y la solicitud deja de aparecer (queda registrada en historial
 * con la observacion automatica del repositorio).
 */
export interface DeleteTicketFormProps {
  ticket: Ticket;
}

export function DeleteTicketForm({ ticket }: DeleteTicketFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  if (ticket.deletedAt) {
    return (
      <p className="rounded-md border border-[--color-border] bg-[--color-surface-muted] px-3 py-2 text-sm text-[--color-text-muted]">
        Esta solicitud fue eliminada el {new Date(ticket.deletedAt).toLocaleString("es-CO")}.
      </p>
    );
  }

  async function handleConfirm() {
    setFormError(null);
    if (!session) return;
    setIsSubmitting(true);
    try {
      await ticketContainer.softDelete.execute(ticket.id, {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      });
      router.push("/tickets");
      router.refresh();
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
      } else {
        setFormError("No pudimos eliminar la solicitud. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div
      className="space-y-3 rounded-lg border border-[--color-border] bg-[--color-surface] p-4"
      role="region"
      aria-label="Eliminar solicitud"
    >
      <header>
        <h3 className="text-sm font-semibold text-[--color-text]">Eliminar solicitud</h3>
        <p className="text-xs text-[--color-text-muted]">
          {isTerminalStatus(ticket.status)
            ? "La solicitud esta en estado terminal; se eliminara de forma definitiva (soft delete)."
            : "La solicitud pasara a estar eliminada y dejara de aparecer en el listado."}
        </p>
      </header>
      <FormError message={formError} />
      {confirmOpen ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" variant="danger" isLoading={isSubmitting} onClick={() => void handleConfirm()}>
            Si, eliminar
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="button" variant="danger" onClick={() => setConfirmOpen(true)}>
            Eliminar solicitud
          </Button>
        </div>
      )}
    </div>
  );
}
