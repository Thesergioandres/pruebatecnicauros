"use client";

import { useEffect, useRef } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { useSession } from "../../hooks/useSession.js";

/**
 * Bootstrap de sesion para todas las rutas autenticadas.
 *
 * Renderiza los children de inmediato (no bloquea la UI) y en
 * paralelo intenta restaurar la sesion via `GET /api/auth/me` (cookie
 * httpOnly). Si la API confirma sesion, se inyecta en el contexto.
 * Si no hay sesion, los `Guard` hijos (TicketsGuard, AdminGuard)
 * redirigen a `/login` como ultima linea de defensa.
 *
 * Por que no bloqueamos: el bloqueo inicial provocaba pantallas en
 * blanco durante la navegacion SPA. Renderizar de inmediato y
 * dejar que la sesion llegue por el canal paralelo es mas fluido y
 * robusto.
 */
export function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useSession();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (session) return;
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    void authContainer.refresh().then((restored) => {
      if (restored) setSession(restored);
    });
  }, [session, setSession]);

  return <>{children}</>;
}
