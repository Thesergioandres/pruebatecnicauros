"use client";

import { registerSchema, type RegisterInput } from "@soporte/shared";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { Card, CardHeader } from "../ui/Card.js";
import { FormError } from "../ui/FormError.js";
import { TextField } from "../ui/TextField.js";

type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

function issuesToFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      (key === "name" || key === "email" || key === "password")
    ) {
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
  }
  return errors;
}

function isApiFieldKey(value: string): value is keyof RegisterInput {
  return value === "name" || value === "email" || value === "password";
}

function focusFor(name: keyof RegisterInput, refs: {
  nameRef: React.RefObject<HTMLInputElement | null>;
  emailRef: React.RefObject<HTMLInputElement | null>;
  passwordRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (name === "name") refs.nameRef.current?.focus();
  else if (name === "email") refs.emailRef.current?.focus();
  else refs.passwordRef.current?.focus();
}

export function RegisterForm() {
  const { setSession } = useSession();
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refs = { nameRef, emailRef, passwordRef };

  function clearFieldError(name: keyof RegisterInput) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errs = issuesToFieldErrors(parsed.error.issues);
      setFieldErrors(errs);
      const firstKey = (Object.keys(errs)[0] ?? "name") as keyof RegisterInput;
      focusFor(firstKey, refs);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const session = await authContainer.register.execute(parsed.data);
      setSession(session);
    } catch (error) {
      if (error instanceof HttpError) {
        setFormError(error.message);
        let firstApiKey: keyof RegisterInput | null = null;
        if (error.details && error.details.length > 0) {
          const apiErrors: FieldErrors = {};
          for (const detail of error.details) {
            if (isApiFieldKey(detail.path) && !apiErrors[detail.path]) {
              apiErrors[detail.path] = detail.message;
              if (!firstApiKey) firstApiKey = detail.path;
            }
          }
          setFieldErrors(apiErrors);
        }
        if (firstApiKey) {
          focusFor(firstApiKey, refs);
        } else if (error.status === 409) {
          focusFor("email", refs);
        } else {
          focusFor("email", refs);
        }
      } else {
        setFormError("No pudimos crear la cuenta. Intenta de nuevo.");
        focusFor("email", refs);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <form
        id={formId}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-5"
        aria-describedby={formError ? `${formId}-form-error` : undefined}
      >
        <CardHeader
          title="Crear cuenta"
          description="Registra tus datos para empezar a usar la plataforma."
        />

        <FormError id={`${formId}-form-error`} message={formError} />

        <TextField
          ref={nameRef}
          label="Nombre"
          name="name"
          type="text"
          value={name}
          onChange={(value) => {
            setName(value);
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
          onChange={(value) => {
            setEmail(value);
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
          label="Contraseña"
          name="password"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearFieldError("password");
          }}
          autoComplete="new-password"
          required
          hint="Mínimo 8 caracteres."
          error={fieldErrors.password}
          disabled={isSubmitting}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Crear cuenta
        </Button>

        <p className="text-center text-sm text-[--color-text-muted]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[--color-brand-700] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
          >
            Inicia sesión
          </Link>
        </p>
      </form>
    </Card>
  );
}
