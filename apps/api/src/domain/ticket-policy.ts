import {
  canTransition as sharedCanTransition,
  isTerminalStatus,
  requiresObservation as sharedRequiresObservation,
  type TicketPriority,
  type TicketStatus,
} from "@soporte/shared";

import {
  InvalidTransitionError,
  ObservationRequiredError,
  TicketLockedError,
} from "./errors.js";
import type { Ticket } from "./ticket.js";

export interface TransitionContext {
  readonly priority: TicketPriority;
  readonly observation?: string;
}

/**
 * Pure predicate: re-export of the shared state machine.
 * Exists in the domain layer so callers do not have to know where the
 * transition table physically lives.
 */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return sharedCanTransition(from, to);
}

/**
 * Pure predicate: re-export of the shared observation rule, with the
 * argument order that matches how use cases reason about transitions
 * (from → to, given a priority).
 */
export function requiresObservationFor(
  from: TicketStatus,
  to: TicketStatus,
  priority: TicketPriority,
): boolean {
  return sharedRequiresObservation(from, to, priority);
}

/**
 * Throws `InvalidTransitionError` if the transition is not allowed, or
 * `ObservationRequiredError` if the spec requires a non-empty observation.
 * Order matters: structural validity is checked before the business rule.
 */
export function assertTransition(
  from: TicketStatus,
  to: TicketStatus,
  context: TransitionContext,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }

  if (!requiresObservationFor(from, to, context.priority)) {
    return;
  }

  const observation = context.observation?.trim() ?? "";
  if (observation.length === 0) {
    throw new ObservationRequiredError();
  }
}

/**
 * Throws `TicketLockedError` when the ticket is in a terminal state and
 * therefore cannot be edited. Use this guard on every PATCH handler that
 * mutates fields other than status.
 */
export function assertEditable(ticket: Ticket): void {
  if (isTerminalStatus(ticket.status)) {
    throw new TicketLockedError(ticket.status);
  }
}
