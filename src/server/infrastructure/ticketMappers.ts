import type {
  Category as DbCategory,
  Priority as DbPriority,
  Ticket as DbTicket,
  TicketStatus as DbStatus,
} from "@/generated/prisma/client";

import type {
  Category,
  HistoryEntry,
  Priority,
  Ticket,
  TicketStatus,
} from "../domain/ticket";

// Wire format uses spec Spanish labels; the DB uses accent-free identifiers.
const PRIORITY_TO_DB: Record<Priority, DbPriority> = {
  Baja: "Baja",
  Media: "Media",
  Alta: "Alta",
  "Crítica": "Critica",
};

const PRIORITY_FROM_DB: Record<DbPriority, Priority> = {
  Baja: "Baja",
  Media: "Media",
  Alta: "Alta",
  Critica: "Crítica",
};

const STATUS_TO_DB: Record<TicketStatus, DbStatus> = {
  Pendiente: "Pendiente",
  "En progreso": "EnProgreso",
  Resuelta: "Resuelta",
  Cancelada: "Cancelada",
};

const STATUS_FROM_DB: Record<DbStatus, TicketStatus> = {
  Pendiente: "Pendiente",
  EnProgreso: "En progreso",
  Resuelta: "Resuelta",
  Cancelada: "Cancelada",
};

export function categoryToDb(value: Category): DbCategory {
  return value;
}

export function priorityToDb(value: Priority): DbPriority {
  return PRIORITY_TO_DB[value];
}

export function priorityFromDb(value: DbPriority): Priority {
  return PRIORITY_FROM_DB[value];
}

export function statusToDb(value: TicketStatus): DbStatus {
  return STATUS_TO_DB[value];
}

export function statusFromDb(value: DbStatus): TicketStatus {
  return STATUS_FROM_DB[value];
}

type DbHistory = {
  id: string;
  ticketId: string;
  fromStatus: DbStatus;
  toStatus: DbStatus;
  actor: string;
  observation: string | null;
  createdAt: Date;
};

export function ticketFromDb(row: DbTicket): Ticket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requester: row.requester,
    requesterEmail: row.requesterEmail,
    category: row.category,
    priority: priorityFromDb(row.priority),
    status: statusFromDb(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function historyFromDb(row: DbHistory): HistoryEntry {
  return {
    id: row.id,
    ticketId: row.ticketId,
    fromStatus: statusFromDb(row.fromStatus),
    toStatus: statusFromDb(row.toStatus),
    actor: row.actor,
    observation: row.observation,
    createdAt: row.createdAt,
  };
}
