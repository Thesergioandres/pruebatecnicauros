import Link from "next/link";

import { TICKET_CATEGORY_LABELS, type Ticket } from "@soporte/shared";

import { PriorityBadge } from "./PriorityBadge.js";
import { StatusBadge } from "./StatusBadge.js";
import { EmptyState } from "../ui/EmptyState.js";

export interface TicketTableProps {
  tickets: Ticket[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function TicketTable({ tickets }: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Ajusta los filtros o limpia la búsqueda para ver más solicitudes."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[--color-border] bg-[--color-surface]">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Listado de solicitudes de soporte</caption>
        <thead className="bg-[--color-surface-muted] text-xs uppercase tracking-wide text-[--color-text-muted]">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Título</th>
            <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
            <th scope="col" className="px-4 py-3 font-semibold">Prioridad</th>
            <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
            <th scope="col" className="px-4 py-3 font-semibold">Solicitante</th>
            <th scope="col" className="px-4 py-3 font-semibold">Actualizado</th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[--color-border]">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-[--color-surface-muted]/60">
              <td className="max-w-xs px-4 py-3 align-top">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="font-semibold text-[--color-text] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
                >
                  {ticket.title}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-xs text-[--color-text-muted]">{ticket.description}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-4 py-3 align-top">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-4 py-3 align-top text-[--color-text-muted]">
                {TICKET_CATEGORY_LABELS[ticket.category]}
              </td>
              <td className="px-4 py-3 align-top text-[--color-text]">{ticket.requester.name}</td>
              <td className="px-4 py-3 align-top text-xs text-[--color-text-muted]">
                {formatDate(ticket.updatedAt)}
              </td>
              <td className="px-4 py-3 align-top text-right">
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="text-xs font-semibold text-[--color-brand-700] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
