"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/presentation/hooks/useSession.js";

/**
 * Home `/`: redirige al panel correspondiente segun el rol.
 *  - ADMIN  -> `/admin` (dashboard de control global)
 *  - USER   -> `/tickets` (sus solicitudes)
 *
 * Mantener la home como redirect (en vez de duplicar contenido del
 * dashboard) evita contenido fantasma y deja una sola fuente de verdad
 * para cada vista.
 */
export default function HomeRedirect() {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    const target = session.user.role === "ADMIN" ? "/admin" : "/tickets";
    router.replace(target);
  }, [session, router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center py-20 text-sm text-[--color-on-surface-muted]"
    >
      Redirigiendo...
    </div>
  );
}
