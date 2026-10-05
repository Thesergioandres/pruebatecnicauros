import type {
  CreateTicketInput,
  Ticket,
  UpdateTicketInput,
} from "@soporte/shared";

import type {
  ListTicketsQuery,
  ListTicketsResult,
  TicketHistoryEntry,
} from "../../domain/tickets.js";

/**
 * Puerto de la feature de tickets. La capa de presentacion solo conoce
 * este contrato; la implementacion concreta (en memoria para este shell,
 * HTTP para produccion) se elige en `infrastructure/container.ts`.
 */
export interface TicketRepository {
  // Lista con busqueda + filtros + orden + paginacion. Devuelve `Page<Ticket>`.
  list(query: ListTicketsQuery): Promise<ListTicketsResult>;

  // Detalle por id; devuelve `null` si no existe o esta borrado.
  getById(id: string): Promise<Ticket | null>;

  // Crea una solicitud. El solicitante lo pasa la capa de aplicacion
  // derivandolo de la sesion httpOnly (en el mock, se pasa el current user).
  create(
    input: CreateTicketInput,
    requester: { id: string; name: string; email: string },
  ): Promise<Ticket>;

  // Edita campos. Rechaza si la solicitud esta en estado terminal.
  update(id: string, input: UpdateTicketInput): Promise<Ticket>;

  // Cambia de estado respetando la maquina de transiciones + observacion
  // obligatoria en CRITICA -> RESUELTA.
  changeStatus(
    id: string,
    nextStatus: Ticket["status"],
    observation: string | undefined,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket>;

  // Atajo: transiciona a CANCELADA con observacion opcional.
  cancel(
    id: string,
    observation: string | undefined,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket>;

  // Soft delete. Lo ejecuta exclusivamente un `ADMIN`. Una vez borrada,
  // la solicitud deja de aparecer en el listado por defecto.
  softDelete(
    id: string,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket>;

  // Historial paginado (mas reciente primero).
  history(
    id: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: TicketHistoryEntry[]; total: number }>;

  // Usuarios asignables (para el selector de responsable).
  listUsers(): Promise<{ id: string; name: string; email: string }[]>;
}
