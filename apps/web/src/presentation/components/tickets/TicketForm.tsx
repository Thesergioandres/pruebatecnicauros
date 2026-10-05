"use client";

import {
  createTicketSchema,
  updateTicketSchema,
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "@soporte/shared";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { Card, CardHeader } from "../ui/Card.js";
import { FormError } from "../ui/FormError.js";
import { Select } from "../ui/Select.js";
import { TextField } from "../ui/TextField.js";
import { Textarea } from "../ui/Textarea.js";

type FieldErrors = Partial<Record<keyof (CreateTicketInput & UpdateTicketInput), string>>;

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({ value, label: TICKET_CATEGORY_LABELS[value] }));
const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((value) => ({ value, label: TICKET_PRIORITY_LABELS[value] }));

export interface TicketFormInitialValues {
  title?: string;
  description?: string;
  category?: (typeof TICKET_CATEGORIES)[number];
  priority?: (typeof TICKET_PRIORITIES)[number];
  assignedToId?: string | null;
}

export interface TicketFormProps {
  mode: "create" | "edit";
  ticketId?: string;
  initialValues?: TicketFormInitialValues;
  submitLabel?: string;
}

function issuesToFieldErrors(issues: { path: (string | number)[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      (key === "title" ||
        key === "description" ||
        key === "category" ||
        key === "priority" ||
        key === "assignedToId")
    ) {
      if (!errors[key as keyof FieldErrors]) {
        errors[key as keyof FieldErrors] = issue.message;
      }
    }
  }
  return errors;
}

function isApiFieldKey(value: string): value is keyof FieldErrors {
  return (
    value === "title" ||
    value === "description" ||
    value === "category" ||
    value === "priority" ||
    value === "assignedToId"
  );
}

export function TicketForm({ mode, ticketId, initialValues, submitLabel }: TicketFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [category, setCategory] = useState<(typeof TICKET_CATEGORIES)[number]>(
    initialValues?.category ?? "HARDWARE",
  );
  const [priority, setPriority] = useState<(typeof TICKET_PRIORITIES)[number]>(
    initialValues?.priority ?? "MEDIA",
  );
  const [assignedToId, setAssignedToId] = useState<string>(initialValues?.assignedToId ?? "");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carga el combo de usuarios (responsables) una vez.
  useEffect(() => {
    let cancelled = false;
    void ticketContainer.listUsers.execute().then((list) => {
      if (!cancelled) setUsers(list);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function clearFieldError(name: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function focusFirstError(errors: FieldErrors) {
    const order: Array<keyof FieldErrors> = ["title", "description", "category", "priority", "assignedToId"];
    const first = order.find((key) => errors[key]);
    if (first === "description") descriptionRef.current?.focus();
    else if (first === "title" || first === "category" || first === "priority" || first === "assignedToId") {
      titleRef.current?.focus();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const basePayload = {
      title,
      description,
      category,
      priority,
      assignedToId: assignedToId === "" ? null : assignedToId,
    };

    const schema = mode === "create" ? createTicketSchema : updateTicketSchema;
    const parsed = schema.safeParse(basePayload);
    if (!parsed.success) {
      const errs = issuesToFieldErrors(parsed.error.issues);
      setFieldErrors(errs);
      focusFirstError(errs);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        if (!session) {
          setFormError("Necesitas iniciar sesión para crear una solicitud.");
          return;
        }
        const ticket = await ticketContainer.create.execute(parsed.data as CreateTicketInput, {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        });
        router.push(`/tickets/${ticket.id}`);
        router.refresh();
      } else {
        if (!ticketId) return;
        await ticketContainer.update.execute(ticketId, parsed.data as UpdateTicketInput);
        router.push(`/tickets/${ticketId}`);
        router.refresh();
      }
    } catch (err) {
      if (err instanceof HttpError) {
        setFormError(err.message);
        if (err.details && err.details.length > 0) {
          const apiErrors: FieldErrors = {};
          for (const detail of err.details) {
            if (isApiFieldKey(detail.path) && !apiErrors[detail.path]) {
              apiErrors[detail.path] = detail.message;
            }
          }
          setFieldErrors(apiErrors);
          focusFirstError(apiErrors);
        }
      } else {
        setFormError(
          mode === "create"
            ? "No pudimos crear la solicitud. Intenta de nuevo."
            : "No pudimos guardar los cambios. Intenta de nuevo.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const label = submitLabel ?? (mode === "create" ? "Crear solicitud" : "Guardar cambios");
  const descriptionHint =
    mode === "create"
      ? "Incluye pasos para reproducir el problema, equipo, hora y mensajes de error."
      : "Solo se actualizará si la solicitud no está en estado terminal.";

  return (
    <Card className="w-full max-w-2xl p-6 sm:p-8">
      <form
        id={formId}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5"
        aria-describedby={formError ? `${formId}-form-error` : undefined}
      >
        <CardHeader
          title={mode === "create" ? "Nueva solicitud" : "Editar solicitud"}
          description={descriptionHint}
        />

        <FormError id={`${formId}-form-error`} message={formError} />

        <TextField
          ref={titleRef}
          label="Título"
          name="title"
          value={title}
          onChange={(v) => {
            setTitle(v);
            clearFieldError("title");
          }}
          required
          maxLength={120}
          placeholder="Resumen breve del problema"
          error={fieldErrors.title}
          disabled={isSubmitting}
        />

        <Textarea
          ref={descriptionRef}
          label="Descripción"
          name="description"
          value={description}
          onChange={(v) => {
            setDescription(v);
            clearFieldError("description");
          }}
          required
          rows={5}
          maxLength={2000}
          hint="Mínimo 10 caracteres. Incluye contexto y, si aplica, pasos para reproducir."
          error={fieldErrors.description}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Categoría"
            name="category"
            value={category}
            onChange={(v) => {
              setCategory(v as (typeof TICKET_CATEGORIES)[number]);
              clearFieldError("category");
            }}
            required
            options={CATEGORY_OPTIONS}
            error={fieldErrors.category}
            disabled={isSubmitting}
          />

          <Select
            label="Prioridad"
            name="priority"
            value={priority}
            onChange={(v) => {
              setPriority(v as (typeof TICKET_PRIORITIES)[number]);
              clearFieldError("priority");
            }}
            required
            options={PRIORITY_OPTIONS}
            error={fieldErrors.priority}
            disabled={isSubmitting}
          />
        </div>

        <Select
          label="Responsable"
          name="assignedToId"
          value={assignedToId}
          onChange={(v) => {
            setAssignedToId(v);
            clearFieldError("assignedToId");
          }}
          placeholder="Sin asignar"
          options={[
            { value: "", label: "Sin asignar" },
            ...users.map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` })),
          ]}
          error={fieldErrors.assignedToId}
          disabled={isSubmitting}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {label}
          </Button>
        </div>
      </form>
    </Card>
  );
}
