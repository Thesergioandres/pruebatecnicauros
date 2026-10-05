"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { TicketForm, type TicketFormValues } from "@/components/TicketForm";
import { TransitionForm } from "@/components/TransitionForm";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { ApiError, api, type TicketDetailDto } from "@/lib/api";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function run(): Promise<void> {
      try {
        const detail = await api.get(id);
        if (!active) return;
        setTicket(detail);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "No se pudo cargar la solicitud.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [id, reload]);

  function refresh(): void {
    setLoading(true);
    setReload((value) => value + 1);
  }

  async function handleUpdate(values: TicketFormValues): Promise<void> {
    setFormError(null);
    try {
      const updated = await api.update(id, {
        title: values.title.trim(),
        description: values.description.trim(),
        requester: values.requester.trim(),
        requesterEmail:
          values.requesterEmail.trim() === "" ? null : values.requesterEmail.trim(),
        category: values.category,
        priority: values.priority,
      });
      setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    }
  }

  async function handleTransition(data: {
    to: string;
    actor: string;
    observation?: string;
  }): Promise<void> {
    setTransitionError(null);
    try {
      await api.transition(id, data);
      refresh();
    } catch (err) {
      setTransitionError(
        err instanceof ApiError ? err.message : "No se pudo cambiar el estado.",
      );
    }
  }

  async function handleDelete(): Promise<void> {
    await api.remove(id);
    router.push("/tickets");
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Cargando solicitud" className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8">
        <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-100" />
        <div className="h-40 animate-pulse rounded bg-zinc-100" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error ?? "Solicitud no encontrada."}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded-md border border-red-300 px-3 py-1 text-sm font-medium hover:bg-red-100"
            >
              Reintentar
            </button>
            <Link href="/tickets" className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Volver a la lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/tickets" className="text-sm text-blue-700 hover:underline">
        ← Volver a la lista
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">{ticket.title}</h1>
        <div className="flex gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500">Solicitante</dt>
          <dd className="text-zinc-900">{ticket.requester}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Categoría</dt>
          <dd className="text-zinc-900">{ticket.category}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Creada</dt>
          <dd className="text-zinc-900">{formatDateTime(ticket.createdAt)}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Actualizada</dt>
          <dd className="text-zinc-900">{formatDateTime(ticket.updatedAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500">Descripción</dt>
          <dd className="whitespace-pre-wrap text-zinc-900">{ticket.description}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        {editing ? (
          <>
            <h2 className="mb-3 text-base font-semibold text-zinc-900">Editar solicitud</h2>
            <TicketForm
              initial={{
                title: ticket.title,
                description: ticket.description,
                requester: ticket.requester,
                requesterEmail: ticket.requesterEmail ?? "",
                category: ticket.category,
                priority: ticket.priority,
              }}
              submitLabel="Guardar cambios"
              pendingLabel="Guardando…"
              serverError={formError}
              onSubmit={handleUpdate}
            />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-3 text-sm text-zinc-600 hover:underline"
            >
              Cancelar edición
            </button>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setEditing(true);
              }}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Editar
            </button>
            <DeleteButton onDelete={handleDelete} />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <TransitionForm
          currentStatus={ticket.status}
          priority={ticket.priority}
          serverError={transitionError}
          onTransition={handleTransition}
        />
      </div>

      <section aria-labelledby="history-heading" className="mt-6">
        <h2 id="history-heading" className="text-base font-semibold text-zinc-900">
          Historial de cambios ({ticket.history.length})
        </h2>
        {ticket.history.length === 0 ? (
          <p role="status" className="mt-2 text-sm text-zinc-500">
            Aún sin cambios de estado.
          </p>
        ) : (
          <ol className="mt-3 space-y-3 border-l-2 border-zinc-200 pl-4">
            {ticket.history.map((entry) => (
              <li key={entry.id} className="text-sm">
                <p className="font-medium text-zinc-900">
                  {entry.fromStatus} → {entry.toStatus}
                </p>
                <p className="text-zinc-600">
                  {entry.actor} · {formatDateTime(entry.createdAt)}
                </p>
                {entry.observation ? (
                  <p className="mt-1 rounded bg-zinc-50 px-2 py-1 text-zinc-700">
                    {entry.observation}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
