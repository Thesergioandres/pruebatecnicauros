import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "./enums.js";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "./enums.js";

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  RED: "Red",
  ACCESOS: "Accesos",
  OTROS: "Otros",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  RESUELTA: "Resuelta",
  CANCELADA: "Cancelada",
};

const CATEGORY_LABELS: ReadonlyMap<TicketCategory, string> = new Map(
  TICKET_CATEGORIES.map((category) => [category, TICKET_CATEGORY_LABELS[category]]),
);

const PRIORITY_LABELS: ReadonlyMap<TicketPriority, string> = new Map(
  TICKET_PRIORITIES.map((priority) => [priority, TICKET_PRIORITY_LABELS[priority]]),
);

const STATUS_LABELS: ReadonlyMap<TicketStatus, string> = new Map(
  TICKET_STATUSES.map((status) => [status, TICKET_STATUS_LABELS[status]]),
);

export function categoryLabel(category: TicketCategory): string {
  return CATEGORY_LABELS.get(category) ?? category;
}

export function priorityLabel(priority: TicketPriority): string {
  return PRIORITY_LABELS.get(priority) ?? priority;
}

export function statusLabel(status: TicketStatus): string {
  return STATUS_LABELS.get(status) ?? status;
}
