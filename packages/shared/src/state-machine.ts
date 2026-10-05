import type { TicketPriority, TicketStatus } from "./enums.js";

export const TICKET_STATUS_TRANSITIONS: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = {
  PENDIENTE: ["EN_PROGRESO", "CANCELADA"],
  EN_PROGRESO: ["PENDIENTE", "RESUELTA", "CANCELADA"],
  RESUELTA: [],
  CANCELADA: [],
};

export const TERMINAL_TICKET_STATUSES: readonly TicketStatus[] = [
  "RESUELTA",
  "CANCELADA",
];

export const EDITABLE_TICKET_STATUSES: readonly TicketStatus[] = [
  "PENDIENTE",
  "EN_PROGRESO",
];

export function allowedTransitionsFrom(
  status: TicketStatus,
): readonly TicketStatus[] {
  return TICKET_STATUS_TRANSITIONS[status] ?? [];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return allowedTransitionsFrom(from).includes(to);
}

export function isTerminalStatus(status: TicketStatus): boolean {
  return TERMINAL_TICKET_STATUSES.includes(status);
}

export function isEditableStatus(status: TicketStatus): boolean {
  return EDITABLE_TICKET_STATUSES.includes(status);
}

export function requiresObservation(
  from: TicketStatus,
  to: TicketStatus,
  priority: TicketPriority,
): boolean {
  return priority === "CRITICA" && from !== "RESUELTA" && to === "RESUELTA";
}
