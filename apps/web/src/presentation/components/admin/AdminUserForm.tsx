"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import {
  ADMIN_USER_ROLES,
  ROLE_LABELS,
  createAdminUserSchema,
  type CreateAdminUserInput,
} from "../../../domain/admin-users.js";
import { adminContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { Button } from "../ui/Button.js";
import { Card, CardHeader } from "../ui/Card.js";
import { FormError } from "../ui/FormError.js";
import { Select } from "../ui/Select.js";
import { TextField } from "../ui/TextField.js";

type FieldErrors = Partial<Record<keyof CreateAdminUserInput, string>>;

function issuesToFieldErrors(issues: { path: (string | number)[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && (key === "name" || key === "email" || key === "password" || key === "role")) {
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
  }
  return errors;
}

function isApiFieldKey(value: string): value is keyof FieldErrors {
  return value === "name" || value === "email" || value === "password" || value === "role";
}

export function AdminUserForm() {
  const router = useRouter();
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ADMIN_USER_ROLES)[number]>("USER");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFieldError(name: keyof FieldErrors) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function focusField(name: keyof FieldErrors) {
    const ref = name === "name" ? nameRef : name === "email" ? emailRef : passwordRef;
    ref.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = createAdminUserSchema.safeParse({ name, email, password, role });
    if (!parsed.success) {
      const errs = issuesToFieldErrors(parsed.error.issues);
      setFieldErrors(errs);
      const firstKey = (Object.keys(errs)[0] ?? "name") as keyof FieldErrors;
      focusField(firstKey);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await adminContainer.createUser.execute(parsed.data);
      router.push("/admin/users");
      router.refresh();
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
          const first = (Object.keys(apiErrors)[0] ?? "name") as keyof FieldErrors;
          focusField(first);
        }
      } else {
        setFormError("No pudimos crear el usuario. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
          title="Crear usuario"
          description="Da de alta a un nuevo cliente o administrador. Podra iniciar sesion de inmediato."
        />

        <FormError id={`${formId}-form-error`} message={formError} />

        <TextField
          ref={nameRef}
          label="Nombre"
          name="name"
          value={name}
          onChange={(v) => {
            setName(v);
            clearFieldError("name");
          }}
          autoComplete="name"
          required
          error={fieldErrors.name}
          disabled={isSubmitting}
        />

        <TextField
          ref={emailRef}
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            clearFieldError("email");
          }}
          autoComplete="email"
          inputMode="email"
          required
          placeholder="persona@empresa.com"
          error={fieldErrors.email}
          disabled={isSubmitting}
        />

        <TextField
          ref={passwordRef}
          label="Contrasena inicial"
          name="password"
          type="password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            clearFieldError("password");
          }}
          autoComplete="new-password"
          required
          hint="Minimo 8 caracteres. El usuario podra cambiarla despues."
          error={fieldErrors.password}
          disabled={isSubmitting}
        />

        <Select
          label="Rol"
          name="role"
          value={role}
          onChange={(v) => {
            setRole(v as (typeof ADMIN_USER_ROLES)[number]);
            clearFieldError("role");
          }}
          required
          options={ADMIN_USER_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
          error={fieldErrors.role}
          disabled={isSubmitting}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/admin/users")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Crear usuario
          </Button>
        </div>
      </form>
    </Card>
  );
}
