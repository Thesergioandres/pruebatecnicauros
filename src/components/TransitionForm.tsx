"use client";

import { useState } from "react";

import { canTransition } from "@/server/domain/ticket";

const ALL_STATUSES = ["Pendiente", "En progreso", "Resuelta", "Cancelada"];

interface TransitionFormProps {
  currentStatus: string;
  priority: string;
  serverError: string | null;
  onTransition: (data: {
    to: string;
    actor: string;
    observation?: string;
  }) => Promise<void>;
}

export function TransitionForm({
  currentStatus,
  priority,
  serverError,
  onTransition,
}: TransitionFormProps) {
  const allowed = ALL_STATUSES.filter(
    (s) =>
      s !== currentStatus &&
      canTransition(
        currentStatus as "Pendiente",
        s as "Pendiente",
      ),
  );
  const [to, setTo] = useState(allowed[0] ?? "");
  const [actor, setActor] = useState("");
  const [observation, setObservation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const needsObservation = priority === "Crítica" && to === "Resuelta";

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Estado terminal: la solicitud ya no puede cambiar de estado.
      </p>
    );
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (actor.trim().length < 2) {
      setError("Indica el responsable del cambio.");
      return;
    }
    if (needsObservation && observation.trim().length === 0) {
      setError("Resolver una solicitud crítica exige una observación.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onTransition({
        to,
        actor: actor.trim(),
        observation: observation.trim() === "" ? undefined : observation.trim(),
      });
      setActor("");
      setObservation("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">Cambiar estado</h3>
      {serverError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="transition-to" className="mb-1 block text-sm font-medium text-zinc-900">
            Nuevo estado
          </label>
          <select
            id="transition-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {allowed.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="transition-actor" className="mb-1 block text-sm font-medium text-zinc-900">
            Responsable
          </label>
          <input
            id="transition-actor"
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="transition-observation" className="mb-1 block text-sm font-medium text-zinc-900">
          Observación{" "}
          {needsObservation ? (
            <span className="font-normal text-red-700">(obligatoria para crítica)</span>
          ) : (
            <span className="font-normal text-zinc-500">(opcional)</span>
          )}
        </label>
        <textarea
          id="transition-observation"
          rows={2}
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? "Aplicando…" : "Aplicar cambio"}
      </button>
    </form>
  );
}
