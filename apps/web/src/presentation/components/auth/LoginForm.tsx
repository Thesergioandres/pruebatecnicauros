"use client";

import { loginSchema, type LoginInput } from "@soporte/shared";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { useSession } from "../../hooks/useSession.js";
import { Button } from "../ui/Button.js";
import { Card, CardHeader } from "../ui/Card.js";
import { FormError } from "../ui/FormError.js";
import { TextField } from "../ui/TextField.js";

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

function issuesToFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && (key === "email" || key === "password")) {
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
  }
  return errors;
}

function isApiFieldKey(value: string): value is keyof LoginInput {
  return value === "email" || value === "password";
}

export function LoginForm() {
  const { setSession } = useSession();
  const formId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFieldError(name: keyof LoginInput) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function focusField(name: keyof LoginInput) {
    const ref = name === "email" ? emailRef : passwordRef;
    ref.current?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs = issuesToFieldErrors(parsed.error.issues);
      setFieldErrors(errs);
      const firstKey = (Object.keys(errs)[0] ?? "email") as keyof LoginInput;
      focusField(firstKey);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const session = await authContainer.login.execute(parsed.data);
      setSession(session);
    } catch (error) {
      if (error instanceof HttpError) {
        setFormError(error.message);
        let firstApiKey: keyof LoginInput | null = null;
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
        focusField(firstApiKey ?? (error.status === 401 ? "password" : "email"));
      } else {
        setFormError("No pudimos iniciar sesión. Intenta de nuevo.");
        focusField("email");
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
          title="Iniciar sesión"
          description="Accede con tu cuenta para gestionar las solicitudes de soporte."
        />

        <FormError id={`${formId}-form-error`} message={formError} />

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
          autoComplete="current-password"
          required
          error={fieldErrors.password}
          disabled={isSubmitting}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Ingresar
        </Button>

        <p className="text-center text-sm text-[--color-text-muted]">
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-semibold text-[--color-brand-700] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
          >
            Crea una
          </Link>
        </p>

        <p className="rounded-md bg-[--color-surface-muted] px-3 py-2 text-xs text-[--color-text-muted]">
          <span className="font-semibold text-[--color-text]">Demo:</span> usa{" "}
          <code>demo@soporte.local</code> / <code>demo1234</code> o escribe{" "}
          <code>wrongpass</code> en contraseña para ver el error.
        </p>
      </form>
    </Card>
  );
}
