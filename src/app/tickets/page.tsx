"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PriorityBadge, StatusBadge } from "@/components/badges";
import { ApiError, api, type PageDto, type TicketDto } from "@/lib/api";

const STATUS_OPTIONS = ["", "Pendiente", "En progreso", "Resuelta", "Cancelada"];
const PRIORITY_OPTIONS = ["", "Baja", "Media", "Alta", "Crítica"];
const CATEGORY_OPTIONS = ["", "Hardware", "Software", "Red", "Accesos", "Otros"];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Creación" },
  { value: "updatedAt", label: "Actualización" },
  { value: "priority", label: "Prioridad" },
  { value: "title", label: "Título" },
];

const selectClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900";

export default function TicketsPage() {
  const [query, setQuery] = useState({
    q: "",
    status: "",
    priority: "",
    category: "",
    sort: "createdAt",
    order: "desc",
    page: 1,
  });
  const [result, setResult] = useState<PageDto<TicketDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // All state updates happen after an await or in event handlers: no
  // synchronous setState inside the effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    let active = true;
    async function run(): Promise<void> {
      try {
        const page = await api.list({ ...query, pageSize: 10 });
        if (!active) return;
        setResult(page);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "No se pudo cargar la lista.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [query, reload]);

  function update(patch: Partial<typeof query>): void {
    setLoading(true);
    setQuery((prev) => ({ ...prev, ...patch, page: 1 }));
  }

  function retry(): void {
    setLoading(true);
    setReload((value) => value + 1);
  }

  function goToPage(page: number): void {
    setLoading(true);
    setQuery((prev) => ({ ...prev, page }));
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Solicitudes de soporte
          </h1>
          <p className="text-sm text-zinc-600">
            {result ? `${result.total} en total` : "Cargando…"}
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Nueva solicitud
        </Link>
      </div>

      <form
        aria-label="Buscar y filtrar solicitudes"
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="search"
          aria-label="Buscar por título o descripción"
          placeholder="Buscar…"
          value={query.q}
          onChange={(e) => update({ q: e.target.value })}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        />
        <select
          aria-label="Filtrar por estado"
          value={query.status}
          onChange={(e) => update({ status: e.target.value })}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === "" ? "Todos los estados" : o}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por prioridad"
          value={query.priority}
          onChange={(e) => update({ priority: e.target.value })}
          className={selectClass}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === "" ? "Todas las prioridades" : o}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por categoría"
          value={query.category}
          onChange={(e) => update({ category: e.target.value })}
          className={selectClass}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o === "" ? "Todas las categorías" : o}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar por"
          value={query.sort}
          onChange={(e) => update({ sort: e.target.value })}
          className={selectClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Ordenar: {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Dirección del orden"
          value={query.order}
          onChange={(e) => update({ order: e.target.value })}
          className={selectClass}
        >
          <option value="desc">Descendente</option>
          <option value="asc">Ascendente</option>
        </select>
      </form>

      {loading ? (
        <div aria-busy="true" aria-label="Cargando solicitudes" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-zinc-100" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-md border border-red-300 px-3 py-1 text-sm font-medium hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && result && result.data.length === 0 ? (
        <div role="status" className="rounded-md border border-dashed border-zinc-300 px-4 py-12 text-center">
          <h2 className="text-base font-medium text-zinc-900">Sin resultados</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Ajusta los filtros o crea la primera solicitud.
          </p>
          <Link
            href="/tickets/new"
            className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Nueva solicitud
          </Link>
        </div>
      ) : null}

      {!loading && !error && result && result.data.length > 0 ? (
        <>
          <ul className="space-y-2 md:hidden">
            {result.data.map((ticket) => (
              <li key={ticket.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <Link href={`/tickets/${ticket.id}`} className="font-medium text-blue-700 hover:underline">
                  {ticket.title}
                </Link>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span className="text-xs text-zinc-500">{ticket.category}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Título</th>
                  <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2 font-medium">Prioridad</th>
                  <th scope="col" className="px-3 py-2 font-medium">Categoría</th>
                  <th scope="col" className="px-3 py-2 font-medium">Solicitante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {result.data.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium text-blue-700 hover:underline">
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={ticket.status} /></td>
                    <td className="px-3 py-2"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-3 py-2 text-zinc-600">{ticket.category}</td>
                    <td className="px-3 py-2 text-zinc-600">{ticket.requester}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
            <p className="text-zinc-600">
              Página {result.page} de {Math.max(result.totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={result.page <= 1}
                onClick={() => goToPage(result.page - 1)}
                className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={result.page >= result.totalPages}
                onClick={() => goToPage(result.page + 1)}
                className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
