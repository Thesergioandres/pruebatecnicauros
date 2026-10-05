"use client";

import { useState } from "react";

export const CATEGORY_OPTIONS = [
  "Hardware",
  "Software",
  "Red",
  "Accesos",
  "Otros",
];

export const PRIORITY_OPTIONS = ["Baja", "Media", "Alta", "Crítica"];

export interface TicketFormValues {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  category: string;
  priority: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors backend ticketSchemas so users get instant feedback; the server
// re-validates everything (never trust the client).
export function validateTicketForm(values: TicketFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.title.trim().length < 5) {
    errors["title"] = "Mínimo 5 caracteres.";
  } else if (values.title.trim().length > 120) {
    errors["title"] = "Máximo 120 caracteres.";
  }
  if (values.description.trim().length < 10) {
    errors["description"] = "Mínimo 10 caracteres.";
  } else if (values.description.trim().length > 2000) {
    errors["description"] = "Máximo 2000 caracteres.";
  }
  if (values.requester.trim().length < 2) {
    errors["requester"] = "Indica quién solicita (mínimo 2 caracteres).";
  } else if (values.requester.trim().length > 80) {
    errors["requester"] = "Máximo 80 caracteres.";
  }
  if (values.requesterEmail.trim() !== "" && !EMAIL_PATTERN.test(values.requesterEmail.trim())) {
    errors["requesterEmail"] = "Correo electrónico inválido.";
  }
  if (!CATEGORY_OPTIONS.includes(values.category)) {
    errors["category"] = "Categoría inválida.";
  }
  if (!PRIORITY_OPTIONS.includes(values.priority)) {
    errors["priority"] = "Prioridad inválida.";
  }
  return errors;
}

interface TicketFormProps {
  initial?: Partial<TicketFormValues>;
  submitLabel: string;
  pendingLabel: string;
  serverError: string | null;
  onSubmit: (values: TicketFormValues) => Promise<void>;
}

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";

export function TicketForm({
  initial,
  submitLabel,
  pendingLabel,
  serverError,
  onSubmit,
}: TicketFormProps) {
  const [values, setValues] = useState<TicketFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    requester: initial?.requester ?? "",
    requesterEmail: initial?.requesterEmail ?? "",
    category: initial?.category ?? "Hardware",
    priority: initial?.priority ?? "Media",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function set<K extends keyof TicketFormValues>(key: K, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const found = validateTicketForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setPending(true);
    try {
      await onSubmit(values);
    } finally {
      setPending(false);
    }
  }

  function fieldError(name: string): React.ReactNode {
    if (!errors[name]) return null;
    return (
      <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-red-700">
        {errors[name]}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      ) : null}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-900">
          Título
        </label>
        <input
          id="title"
          type="text"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          aria-describedby={errors["title"] ? "title-error" : undefined}
          aria-invalid={Boolean(errors["title"])}
          className={inputClass}
        />
        {fieldError("title")}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-900">
          Descripción
        </label>
        <textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          aria-describedby={errors["description"] ? "description-error" : undefined}
          aria-invalid={Boolean(errors["description"])}
          className={inputClass}
        />
        {fieldError("description")}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="requester" className="mb-1 block text-sm font-medium text-zinc-900">
            Solicitante
          </label>
          <input
            id="requester"
            type="text"
            value={values.requester}
            onChange={(e) => set("requester", e.target.value)}
            aria-describedby={errors["requester"] ? "requester-error" : undefined}
            aria-invalid={Boolean(errors["requester"])}
            className={inputClass}
          />
          {fieldError("requester")}
        </div>
        <div>
          <label htmlFor="requesterEmail" className="mb-1 block text-sm font-medium text-zinc-900">
            Correo del solicitante <span className="font-normal text-zinc-500">(opcional, para avisos)</span>
          </label>
          <input
            id="requesterEmail"
            type="email"
            value={values.requesterEmail}
            onChange={(e) => set("requesterEmail", e.target.value)}
            aria-describedby={errors["requesterEmail"] ? "requesterEmail-error" : undefined}
            aria-invalid={Boolean(errors["requesterEmail"])}
            className={inputClass}
          />
          {fieldError("requesterEmail")}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-zinc-900">
            Categoría
          </label>
          <select
            id="category"
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className="mb-1 block text-sm font-medium text-zinc-900">
            Prioridad
          </label>
          <select
            id="priority"
            value={values.priority}
            onChange={(e) => set("priority", e.target.value)}
            className={inputClass}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
