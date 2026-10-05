"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { Ticket } from "@soporte/shared";

import { ticketContainer } from "../../../infrastructure/container.js";
import { HttpError } from "../../../infrastructure/http-client.js";
import { PriorityBadge } from "../tickets/PriorityBadge.js";
import { StatusBadge } from "../tickets/StatusBadge.js";
import { Card, CardHeader } from "../ui/Card.js";
import { FormError } from "../ui/FormError.js";

/**
 * Dashboard del administrador. Calcula metricas en cliente a partir de
 * un lote amplio de tickets (PAGE_SIZE_LARGE) y muestra ademas una
 * lista de los mas recientes. Los conteos son orientativos: la API
 * real deberia ofrecer un endpoint dedicado `/api/admin/metrics` para
 * escalar sin traer miles de filas.
 */

const PAGE_SIZE_LARGE = 100;

interface Metrics {
  total: number;
  pendientes: number;
  enProgreso: number;
  resueltos: number;
  cancelados: number;
  criticos: number;
  slaCumplido: number; // porcentaje
}

function computeMetrics(tickets: Ticket[]): Metrics {
  const total = tickets.length;
  const pendientes = tickets.filter((t) => t.status === "PENDIENTE").length;
  const enProgreso = tickets.filter((t) => t.status === "EN_PROGRESO").length;
  const resueltos = tickets.filter((t) => t.status === "RESUELTA").length;
  const cancelados = tickets.filter((t) => t.status === "CANCELADA").length;
  const criticos = tickets.filter(
    (t) => t.priority === "CRITICA" && t.status !== "RESUELTA" && t.status !== "CANCELADA",
  ).length;
  const slaCumplido = total === 0 ? 0 : Math.round((resueltos / total) * 100);
  return { total, pendientes, enProgreso, resueltos, cancelados, criticos, slaCumplido };
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function DashboardClient() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setError(null);
    try {
      const data = await ticketContainer.list.execute({
        filter: {},
        sort: { field: "createdAt", order: "desc" },
        pagination: { page: 1, pageSize: PAGE_SIZE_LARGE },
      });
      if (signal.aborted) return;
      setTickets(data.items);
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof HttpError) {
        setError(err.message);
      } else {
        setError("No pudimos cargar las metricas.");
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const metrics = tickets ? computeMetrics(tickets) : null;
  const recientes = (tickets ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--color-brand-600)]">
            OPS-CENTER // TI-GLOBAL
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
            Centro de Control Global
          </h1>
          <p className="text-sm text-[var(--color-on-surface-muted)]">
            Supervision en tiempo real, asignacion operativa y cumplimiento de SLAs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand-500)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            Crear solicitud
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2 text-sm font-semibold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] transition-colors"
          >
            Gestionar usuarios
          </Link>
        </div>
      </header>

      <FormError message={error} />

      <section
        aria-label="Metricas"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <MetricCard
          label="Total tickets"
          value={metrics?.total}
          tone="info"
          sublabel="Carga global"
        />
        <MetricCard
          label="Pendientes"
          value={metrics?.pendientes}
          tone="neutral"
          sublabel="Cola inicial"
          trend="Requieren primera respuesta"
        />
        <MetricCard
          label="En progreso"
          value={metrics?.enProgreso}
          tone="info"
          sublabel="Activos"
        />
        <MetricCard
          label="Resueltos"
          value={metrics?.resueltos}
          tone="success"
          sublabel={`${metrics?.slaCumplido ?? 0}% SLA`}
        />
        <MetricCard
          label="Criticos abiertos"
          value={metrics?.criticos}
          tone="critical"
          sublabel="P1 sin resolver"
        />
      </section>

      <section aria-label="Tickets recientes" className="space-y-3">
        <Card className="p-0 overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-faint)]">
            <CardHeader
              as="h2"
              title="Tickets recientes"
              description="Ultimos movimientos en la mesa de ayuda"
            />
            <Link
              href="/tickets"
              className="text-xs font-semibold text-[var(--color-brand-700)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] rounded"
            >
              Ver todos →
            </Link>
          </header>

          {tickets === null && !error ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-on-surface-muted)]">
              Cargando tickets...
            </div>
          ) : recientes.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[var(--color-on-surface-muted)]">
              Sin tickets registrados.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-faint)]">
              {recientes.map((t) => (
                <li key={t.id} className="px-5 py-3 hover:bg-[var(--color-surface-muted)] transition-colors">
                  <Link
                    href={`/tickets/${t.id}`}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand-500)] rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate">
                        {t.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-on-surface-muted)]">
                        <span className="font-mono">{t.id.slice(0, 8)}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{t.requester.name}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                      <span className="hidden md:inline font-mono text-[11px] text-[var(--color-on-surface-muted)] tabular-nums whitespace-nowrap">
                        {formatDateTime(t.updatedAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | undefined;
  tone: "info" | "success" | "critical" | "neutral";
  sublabel?: string;
  trend?: string;
}

function MetricCard({ label, value, tone, sublabel, trend }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-muted)]">
          {label}
        </span>
        {tone === "critical" && value && value > 0 ? (
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-critical)] opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-critical)]" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-[var(--color-on-surface)]">
        {value === undefined ? (
          <span className="inline-block h-7 w-12 rounded bg-[var(--color-surface-muted)] animate-pulse" />
        ) : (
          value.toLocaleString("es-CO")
        )}
      </p>
      <p className="mt-1 text-[11px] font-medium text-[var(--color-on-surface-muted)]">
        {sublabel}
      </p>
      {trend ? (
        <p className="mt-1 text-[11px] text-[var(--color-on-surface-faint)]">{trend}</p>
      ) : null}
    </div>
  );
}
