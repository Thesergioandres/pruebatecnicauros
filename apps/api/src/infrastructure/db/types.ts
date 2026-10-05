/**
 * Tipos de fila (row) tal como los entrega `pg`.
 * Coinciden 1:1 con el esquema en `migrations/001_init.sql`.
 *
 * Los repositorios convierten estos tipos a las entidades de dominio.
 * Aqui solo declaramos la forma cruda: snake_case + campos nullable.
 */

export type TicketCategoryCode =
  | "HARDWARE"
  | "SOFTWARE"
  | "RED"
  | "ACCESOS"
  | "OTROS";

export type TicketPriorityCode =
  | "BAJA"
  | "MEDIA"
  | "ALTA"
  | "CRITICA";

export type TicketStatusCode =
  | "PENDIENTE"
  | "EN_PROGRESO"
  | "RESUELTA"
  | "CANCELADA";

export type UserRoleCode = "ADMIN" | "USER";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRoleCode;
  created_at: Date;
  updated_at: Date;
}

export interface TicketRow {
  id: string;
  title: string;
  description: string;
  category: TicketCategoryCode;
  priority: TicketPriorityCode;
  priority_weight: number;
  status: TicketStatusCode;
  requester_id: string;
  assigned_to_id: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  deleted_at: Date | null;
}

export interface TicketHistoryRow {
  id: string;
  ticket_id: string;
  previous_status: TicketStatusCode | null;
  new_status: TicketStatusCode;
  changed_by_id: string;
  observation: string | null;
  created_at: Date;
}

export interface AppliedMigrationRow {
  filename: string;
  applied_at: Date;
}
