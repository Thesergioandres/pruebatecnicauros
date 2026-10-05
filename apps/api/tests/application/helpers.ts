import type {
  Ticket,
  TicketCategory,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
  UserSummary,
} from "@soporte/shared";

/**
 * Helpers de construccion de entidades para tests. Centralizan los
 * defaults para que cada test solo especifique lo que le importa.
 */

const baseDate = "2026-01-01T00:00:00.000Z";

export const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "t-1",
  title: "Ticket de prueba",
  description: "Descripcion suficientemente larga para pasar validacion",
  category: "HARDWARE" as TicketCategory,
  priority: "MEDIA" as TicketPriority,
  status: "PENDIENTE" as TicketStatus,
  requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
  assignedTo: null,
  createdAt: baseDate,
  updatedAt: baseDate,
  resolvedAt: null,
  deletedAt: null,
  ...overrides,
});

export const buildUser = (
  overrides: Partial<UserSummary> = {},
): UserSummary => ({
  id: "u-1",
  name: "Ana",
  email: "ana@example.com",
  ...overrides,
});

export const buildHistoryEntry = (
  overrides: Partial<TicketHistoryEntry> = {},
): TicketHistoryEntry => ({
  id: "h-1",
  ticketId: "t-1",
  previousStatus: null,
  newStatus: "PENDIENTE" as TicketStatus,
  changedBy: { id: "u-1", name: "Ana", email: "ana@example.com" },
  observation: null,
  createdAt: baseDate,
  ...overrides,
});
