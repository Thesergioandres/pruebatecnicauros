// Pure domain logic: no I/O, no framework imports. Testable in isolation.

export const CATEGORIES = [
  "Hardware",
  "Software",
  "Red",
  "Accesos",
  "Otros",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["Baja", "Media", "Alta", "Crítica"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Higher number = more urgent. Used for priority sorting. */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  Baja: 0,
  Media: 1,
  Alta: 2,
  "Crítica": 3,
};

export const STATUSES = [
  "Pendiente",
  "En progreso",
  "Resuelta",
  "Cancelada",
] as const;
export type TicketStatus = (typeof STATUSES)[number];

export const TERMINAL_STATUSES: readonly TicketStatus[] = [
  "Resuelta",
  "Cancelada",
];

/**
 * Allowed transitions. Spec rules:
 * - Pendiente -> En progreso, Pendiente -> Cancelada
 * - En progreso -> Resuelta
 * - Cancelada / Resuelta never leave terminal state
 * Extra (justified in README): En progreso -> Cancelada (abort started work).
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  Pendiente: ["En progreso", "Cancelada"],
  "En progreso": ["Resuelta", "Cancelada"],
  Resuelta: [],
  Cancelada: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  readonly code = "INVALID_TRANSITION" as const;
  readonly from: TicketStatus;
  readonly to: TicketStatus;

  constructor(from: TicketStatus, to: TicketStatus) {
    super(`Cannot transition ticket from "${from}" to "${to}"`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class ObservationRequiredError extends Error {
  readonly code = "OBSERVATION_REQUIRED" as const;

  constructor() {
    super("Resolving a critical-priority ticket requires an observation");
    this.name = "ObservationRequiredError";
  }
}

export interface TransitionContext {
  priority: Priority;
  observation?: string;
}

export interface NewTicketData {
  title: string;
  description: string;
  requester: string;
  requesterEmail?: string;
  category: Category;
  priority: Priority;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  requester: string;
  requesterEmail: string | null;
  category: Category;
  priority: Priority;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoryEntry {
  id: string;
  ticketId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  actor: string;
  observation: string | null;
  createdAt: Date;
}

/**
 * Throws InvalidTransitionError or ObservationRequiredError.
 * Why separate errors with codes: the API maps each to a distinct
 * status code + machine-readable body (422 + code).
 */
export function assertTransition(
  from: TicketStatus,
  to: TicketStatus,
  context: TransitionContext,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
  if (
    to === "Resuelta" &&
    context.priority === "Crítica" &&
    (context.observation ?? "").trim().length === 0
  ) {
    throw new ObservationRequiredError();
  }
}
