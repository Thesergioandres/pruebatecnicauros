import type {
  Ticket as SharedTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserSummary,
} from "@soporte/shared";

/**
 * Domain entity. The wire shape lives in `packages/shared` to keep the
 * contract identical for API and web; here we only add pure helpers and
 * factories that are framework-agnostic.
 */
export type Ticket = SharedTicket;

export interface NewTicketInput {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly requester: UserSummary;
  readonly assignedTo?: UserSummary | null;
  /** ISO 8601 timestamp injected by the caller (portable, testable). */
  readonly now: string;
}

const MIN_TITLE_LENGTH = 5;
const MIN_DESCRIPTION_LENGTH = 10;

const hasMinimumLength = (value: string, min: number): boolean =>
  value.trim().length >= min;

export function buildNewTicket(input: NewTicketInput): Ticket {
  const title = input.title.trim();
  if (!hasMinimumLength(title, MIN_TITLE_LENGTH)) {
    throw new Error(
      `El titulo es obligatorio y debe tener al menos ${MIN_TITLE_LENGTH} caracteres`,
    );
  }

  const description = input.description.trim();
  if (!hasMinimumLength(description, MIN_DESCRIPTION_LENGTH)) {
    throw new Error(
      `La descripcion es obligatoria y debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres`,
    );
  }

  return {
    id: input.id,
    title,
    description,
    category: input.category,
    priority: input.priority,
    status: "PENDIENTE",
    requester: input.requester,
    assignedTo: input.assignedTo ?? null,
    createdAt: input.now,
    updatedAt: input.now,
    resolvedAt: null,
    deletedAt: null,
  };
}

/**
 * Returns a new ticket with the given status and refreshed `updatedAt`.
 * The caller is expected to have validated the transition via
 * `assertTransition` before calling this helper.
 */
export function withStatus(
  ticket: Ticket,
  status: TicketStatus,
  now: string,
): Ticket {
  return { ...ticket, status, updatedAt: now };
}

export function markResolved(ticket: Ticket, now: string): Ticket {
  return { ...ticket, resolvedAt: now, updatedAt: now };
}

export function markDeleted(ticket: Ticket, now: string): Ticket {
  return { ...ticket, deletedAt: now };
}

export function isAssigned(ticket: Ticket): boolean {
  return ticket.assignedTo !== null;
}

export function isOpen(ticket: Ticket): boolean {
  return ticket.status === "PENDIENTE" || ticket.status === "EN_PROGRESO";
}

export function isClosed(ticket: Ticket): boolean {
  return !isOpen(ticket);
}
