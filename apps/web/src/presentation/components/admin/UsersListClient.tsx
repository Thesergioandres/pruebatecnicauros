"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ROLE_LABELS } from "../../../domain/admin-users.js";
import type { AdminUserSummary } from "../../../application/ports/admin-user-repository.js";
import { adminContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { Badge, type BadgeTone } from "../ui/Badge.js";
import { Button } from "../ui/Button.js";
import { FormError } from "../ui/FormError.js";
import { EmptyState } from "../ui/EmptyState.js";

const ROLE_TONE: Record<AdminUserSummary["role"], BadgeTone> = {
  ADMIN: "info",
  USER: "neutral",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export function UsersListClient() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminContainer.listUsers.execute();
      if (signal.aborted) return;
      setUsers(data);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError("No pudimos cargar los usuarios.");
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Usuarios</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Gestiona los accesos de clientes y administradores de la plataforma.
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button>Crear usuario</Button>
        </Link>
      </header>

      <FormError message={error} />

      <div aria-busy={isLoading} aria-live="polite">
        {isLoading ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-sm text-[var(--color-text-muted)]">
            Cargando usuarios…
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="Sin usuarios"
            description="Aun no hay cuentas registradas. Crea la primera desde el boton superior."
            action={
              <Link href="/admin/users/new">
                <Button>Crear usuario</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Listado de usuarios</caption>
              <thead className="bg-[var(--color-surface-muted)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nombre</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Rol</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--color-surface-muted)]/60">
                    <td className="px-4 py-3 align-top font-medium text-[var(--color-text)]">{user.name}</td>
                    <td className="px-4 py-3 align-top text-[var(--color-text-muted)]">{user.email}</td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-[var(--color-text-muted)]">
                      {formatDateTime(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
