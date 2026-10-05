import { ERROR_CODES, type ErrorCode, type TicketStatus } from "@soporte/shared";

/**
 * Base class for domain errors. Every subclass carries a machine-readable
 * `code` that maps 1:1 to an HTTP status in `packages/shared/src/errors.ts`.
 * The API layer never throws or reformats these directly: it catches them
 * and converts via the shared `ERROR_STATUS_BY_CODE` table.
 */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  override readonly name: string = "DomainError";
}

export class InvalidTransitionError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.INVALID_TRANSITION;
  override readonly name: string = "InvalidTransitionError";
  readonly from: TicketStatus;
  readonly to: TicketStatus;

  constructor(from: TicketStatus, to: TicketStatus) {
    super(
      `No se puede transicionar el ticket de "${from}" a "${to}"`,
    );
    this.from = from;
    this.to = to;
  }
}

export class ObservationRequiredError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.OBSERVATION_REQUIRED;
  override readonly name: string = "ObservationRequiredError";

  constructor() {
    super(
      "Resolver un ticket de prioridad CRITICA exige una observacion no vacia",
    );
  }
}

export class TicketLockedError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.TICKET_LOCKED;
  override readonly name: string = "TicketLockedError";
  readonly status: TicketStatus;

  constructor(status: TicketStatus) {
    super(`El ticket en estado "${status}" no puede modificarse`);
    this.status = status;
  }
}
