"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { useSession } from "../../hooks/useSession.js";

/**
 * Guarda de la ruta `(tickets)`. Si no hay sesion activa, redirige a
 * `/login`. Ademas intenta restaurar la sesion desde la API real
 * (cookie httpOnly) al montar, asi un reload dentro de la app no
 * desloguea al usuario cuando el backend esta vivo. Si la API no
 * responde, el repositorio cae al mock y el usuario termina en
 * `/login` como en la sesion normal.
 */
export function TicketsGuard({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useSession();
  const router = useRouter();
  const [isBootstrapping, setIsBootstrapping] = useState(session === null);

  useEffect(() => {
    if (session !== null) {
      setIsBootstrapping(false);
      return;
    }
    let cancelled = false;
    void authContainer.refresh().then((restored) => {
      if (cancelled) return;
      if (restored) {
        setSession(restored);
      }
      setIsBootstrapping(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session, setSession]);

  useEffect(() => {
    if (!isBootstrapping && session === null) {
      router.replace("/login");
    }
  }, [isBootstrapping, session, router]);

  if (isBootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]"
      >
        Cargando sesion…
      </div>
    );
  }

  if (session === null) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]"
      >
        Redirigiendo a inicio de sesion…
      </div>
    );
  }

  return <>{children}</>;
}
