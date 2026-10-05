"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "../../../presentation/hooks/useSession.js";

/**
 * Layout del sub-grupo `(admin)`. La sesion ya esta validada; aqui
 * comprobamos el rol. Un cliente (rol USER) intentando entrar en
 * `/admin/*` se redirige a `/tickets` con su lista de solicitudes.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.replace("/tickets");
    }
  }, [session, router]);

  if (!session || session.user.role !== "ADMIN") return null;
  return <>{children}</>;
}
