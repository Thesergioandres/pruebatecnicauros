"use client";

import Link from "next/link";

import { useSession } from "../hooks/useSession.js";
import { Button } from "./ui/Button.js";
import { Card, CardHeader } from "./ui/Card.js";
import { EmptyState } from "./ui/EmptyState.js";

export function HomeContent() {
  const { session } = useSession();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-[--color-brand-700]">
          Shell de la aplicación
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[--color-text] sm:text-3xl">
          Bienvenido a la plataforma de soporte
        </h1>
        <p className="max-w-2xl text-sm text-[--color-text-muted] sm:text-base">
          Estructura de navegación y autenticación lista. Las pantallas de
          gestión de tickets llegan en la próxima iteración.
        </p>
      </header>

      {session ? (
        <Card className="p-6">
          <CardHeader
            as="h2"
            title={`Hola, ${session.user.name}`}
            description="Sesión iniciada con el shell de autenticación. La API real tomará el relevo sin cambios en esta UI."
          />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[--color-text-muted]">Email</dt>
              <dd className="font-medium text-[--color-text]">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-[--color-text-muted]">Rol</dt>
              <dd className="font-medium text-[--color-text]">{session.user.role}</dd>
            </div>
            <div>
              <dt className="text-[--color-text-muted]">Sesión emitida</dt>
              <dd className="font-medium text-[--color-text]">
                {new Date(session.issuedAt).toLocaleString("es-CO")}
              </dd>
            </div>
            <div>
              <dt className="text-[--color-text-muted]">Expira</dt>
              <dd className="font-medium text-[--color-text]">
                {new Date(session.expiresAt).toLocaleString("es-CO")}
              </dd>
            </div>
          </dl>
        </Card>
      ) : (
        <Card className="p-6">
          <CardHeader
            as="h2"
            title="Empieza por iniciar sesión"
            description="Necesitas una cuenta para registrar solicitudes de soporte."
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/login">
              <Button>Ingresar</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Crear cuenta</Button>
            </Link>
          </div>
        </Card>
      )}

      <EmptyState
        title="Aún no hay solicitudes"
        description="Las pantallas de listado, creación, detalle e historial llegan en el siguiente slice."
        action={
          <Link href="/login">
            <Button variant="secondary">Ir al login</Button>
          </Link>
        }
      />
    </div>
  );
}
