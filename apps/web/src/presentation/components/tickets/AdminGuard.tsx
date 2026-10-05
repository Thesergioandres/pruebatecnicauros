"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { useSession } from "../../hooks/useSession.js";

/**
 * Guarda de la ruta `(admin)`.
 *  - Sin sesion: redirige a `/login`.
 *  - Sesion pero rol `USER`: redirige a `/tickets`.
 *  - Al montar intenta restaurar la sesion via la API real (cookie
 *    httpOnly). Si falla, el repositorio cae al mock y el redirect
 *    normal se aplica.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
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
    if (isBootstrapping) return;
    if (session === null) {
      router.replace("/login");
      return;
    }
    if (session.user.role !== "ADMIN") {
      router.replace("/tickets");
    }
  }, [isBootstrapping, session, router]);

  if (isBootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-[--color-border] bg-[--color-surface] p-6 text-sm text-[--color-text-muted]"
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
        className="rounded-md border border-[--color-border] bg-[--color-surface] p-6 text-sm text-[--color-text-muted]"
      >
        Redirigiendo a inicio de sesion…
      </div>
    );
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div
        role="alert"
        className="rounded-md border border-[--color-danger-200] bg-[--color-danger-50] p-4 text-sm text-[--color-danger-700]"
      >
        No tienes permisos para acceder a esta seccion.
      </div>
    );
  }

  return <>{children}</>;
}
