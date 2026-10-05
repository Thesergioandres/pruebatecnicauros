"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TicketForm, type TicketFormValues } from "@/components/TicketForm";
import { ApiError, api } from "@/lib/api";

export default function NewTicketPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(values: TicketFormValues): Promise<void> {
    setServerError(null);
    try {
      const ticket = await api.create({
        title: values.title.trim(),
        description: values.description.trim(),
        requester: values.requester.trim(),
        requesterEmail:
          values.requesterEmail.trim() === "" ? undefined : values.requesterEmail.trim(),
        category: values.category,
        priority: values.priority,
      });
      router.push(`/tickets/${ticket.id}`);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : "No se pudo crear la solicitud.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">
        Nueva solicitud
      </h1>
      <TicketForm
        submitLabel="Crear solicitud"
        pendingLabel="Creando…"
        serverError={serverError}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
