import type {
  Ticket,
  TicketHistoryEntry,
  UserSummary,
} from "@soporte/shared";

import type {
  TicketHistoryRow,
  TicketRow,
  UserRow,
} from "../types.js";

/**
 * Helpers de mapeo fila (snake_case, tipos pg) -> entidad (camelCase,
 * tipos del dominio). Toda la conversion vive aqui para que las queries
 * no contengan logica de transformacion.
 */

export const toIso = (value: Date): string => value.toISOString();
export const optionalIso = (value: Date | null): string | null =>
  value === null ? null : value.toISOString();

/**
 * Fila de ticket con los datos del solicitante y del asignado ya
 * join-eados. El query debe producir estas columnas explicitamente.
 */
export interface TicketRowWithJoins extends TicketRow {
  requester_name: string;
  requester_email: string;
  assigned_user_id: string | null;
  assigned_name: string | null;
  assigned_email: string | null;
}

export function mapTicketRow(row: TicketRowWithJoins): Ticket {
  const requester: UserSummary = {
    id: row.requester_id,
    name: row.requester_name,
    email: row.requester_email,
  };
  const assignedTo: UserSummary | null =
    row.assigned_user_id === null || row.assigned_name === null || row.assigned_email === null
      ? null
      : {
          id: row.assigned_user_id,
          name: row.assigned_name,
          email: row.assigned_email,
        };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    requester,
    assignedTo,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    resolvedAt: optionalIso(row.resolved_at),
    deletedAt: optionalIso(row.deleted_at),
  };
}

/**
 * Fila de historial con los datos del autor ya join-eados.
 */
export interface TicketHistoryRowWithJoins extends TicketHistoryRow {
  changed_by_name: string;
  changed_by_email: string;
}

export function mapHistoryRow(row: TicketHistoryRowWithJoins): TicketHistoryEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedBy: {
      id: row.changed_by_id,
      name: row.changed_by_name,
      email: row.changed_by_email,
    },
    observation: row.observation,
    createdAt: toIso(row.created_at),
  };
}

export function mapUserRow(row: UserRow): {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRow["role"];
  createdAt: string;
} {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: toIso(row.created_at),
  };
}

export function toUserSummary(row: UserRow): UserSummary {
  return { id: row.id, name: row.name, email: row.email };
}
