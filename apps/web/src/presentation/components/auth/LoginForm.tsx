"use client";

import { loginSchema, type LoginInput } from "@soporte/shared";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { Button } from "../ui/Button.js";

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

function issuesToFieldErrors(
  issues: { path: (string | number)[]; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && (key === "email" || key === "password")) {
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  return errors;
}

function isApiFieldKey(value: string): value is keyof LoginInput {
  return value === "email" || value === "password";
}

/**
 * Login minimalista. Sin marketing lateral, sin estadisticas, sin
 * badges corporativos: solo marca, titulo, dos campos y el boton de
 * entrar. Los errores se muestran en espanol, siempre visibles y con
 * contraste suficiente (clase Tailwind directa `border-red-500` y
 * `text-red-600` para garantizar render aunque fallen los tokens
 * semanticos).
 */
export function LoginForm() {
  const router = useRouter();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      focusField((Object.keys(errs)[0] as keyof LoginInput) ?? "email");
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const session = await authContainer.login.execute(parsed.data);
      const target = session.user.role === "ADMIN" ? "/admin" : "/tickets";
      router.push(target);
      router.refresh();
    } catch (error) {
      if (error instanceof HttpError) {
        setFormError(
          error.status === 401
            ? "Email o contrasena incorrectos. Verifica e intenta de nuevo."
            : error.message,
        );
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
        setFormError("No pudimos iniciar sesion. Intenta de nuevo.");
        focusField("email");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const emailHasError = Boolean(fieldErrors.email);
  const passwordHasError = Boolean(fieldErrors.password);

  // Clases Tailwind concretas para garantizar visibilidad del borde y
  // del texto aunque los tokens semanticos fallen en el build.
  const inputBase =
    "block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 disabled:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed";
  const inputBorder = emailHasError || passwordHasError
    ? "border-red-500"
    : "border-slate-300";

  return (
    <div className="w-full max-w-sm">
      <header className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <svg
            width="20"
            height="20"
            viewBox="0 0 32 32"
            aria-hidden
            className="text-white"
          >
            <rect width="32" height="32" rx="7" fill="currentColor" />
            <path
              d="M9 9h14a3 3 0 0 1 3 3v5h-3v-4a1 1 0 0 0-1-1H10a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5v3H9a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3Z"
              fill="white"
            />
            <circle cx="22" cy="22" r="3" fill="#dadcff" />
          </svg>
        </div>
        <p className="text-base font-semibold tracking-tight text-slate-900">
          Soporte
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Iniciar sesion
        </h1>
      </header>

      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4"
        aria-describedby={formError ? `${formId}-form-error` : undefined}
      >
        <div
          id={`${formId}-form-error`}
          role={formError ? "alert" : undefined}
          className={
            formError
              ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              : "hidden"
          }
        >
          {formError}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={emailId}
            className="block text-sm font-medium text-slate-700"
          >
            Correo
          </label>
          <input
            id={emailId}
            ref={emailRef}
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
            }}
            autoComplete="email"
            inputMode="email"
            required
            placeholder="persona@empresa.com"
            disabled={isSubmitting}
            aria-invalid={emailHasError || undefined}
            aria-describedby={emailHasError ? `${emailId}-error` : undefined}
            className={[inputBase, inputBorder].join(" ")}
          />
          {emailHasError ? (
            <p
              id={`${emailId}-error`}
              role="alert"
              className="text-xs font-medium text-red-600"
            >
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={passwordId}
            className="block text-sm font-medium text-slate-700"
          >
            Contrasena
          </label>
          <div className="relative">
            <input
              id={passwordId}
              ref={passwordRef}
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              aria-invalid={passwordHasError || undefined}
              aria-describedby={passwordHasError ? `${passwordId}-error` : undefined}
              className={[inputBase, inputBorder, "pr-10"].join(" ")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M3 3l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M5 6C3 7.5 1.5 9 1.5 9s1.5 4.5 7.5 4.5c1.1 0 2-.2 2.9-.5M9 5.4c4.6.4 7.5 3.6 7.5 3.6s-1 3-4.3 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M1.5 9s1.5-4.5 7.5-4.5S16.5 9 16.5 9s-1.5 4.5-7.5 4.5S1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              )}
            </button>
          </div>
          {passwordHasError ? (
            <p
              id={`${passwordId}-error`}
              role="alert"
              className="text-xs font-medium text-red-600"
            >
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingLabel="Validando..."
          className="w-full"
          size="lg"
        >
          {isSubmitting ? null : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
