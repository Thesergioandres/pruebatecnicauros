import type {
  Page,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@soporte/shared";

// Re-exports para que la UI consuma los DTOs desde un unico punto.
export type {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketHistoryEntry,
  UserSummary,
  Page,
} from "@soporte/shared";

/**
 * Tipos puros del cliente para la feature de tickets.
 * No dependen de React, Next ni de la capa de transporte.
 */

// Filtros que acepta la lista de tickets (todos opcionales, combinables).
export interface TicketFilter {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  requesterId?: string;
  includeDeleted?: boolean;
}

// Campos y orden admitidos por el listado.
export type TicketSortField = "createdAt" | "updatedAt" | "title" | "priority" | "status";
export type SortOrder = "asc" | "desc";

export interface TicketSort {
  field: TicketSortField;
  order: SortOrder;
}

// Paginacion: pagina 1-based y tamano de pagina.
export interface Pagination {
  page: number;
  pageSize: number;
}

// Parametros completos de un listado.
export interface ListTicketsQuery {
  filter: TicketFilter;
  sort: TicketSort;
  pagination: Pagination;
}

export type ListTicketsResult = Page<Ticket>;

// Contexto de una transicion: util para decidir reglas extra (p. ej. observacion).
export type StatusChangeContext = {
  from: TicketStatus;
  to: TicketStatus;
  priority: TicketPriority;
};
