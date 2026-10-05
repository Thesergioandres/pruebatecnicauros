import { TERMINAL_STATUSES, type Ticket } from "../domain/ticket";
import { ticketRepository } from "../composition";
import { CodedError, NotFoundError } from "./errors";
import type { TicketRepository } from "./ports";
import { ticketIdSchema, updateTicketSchema } from "./ticketSchemas";

// Status has its own transition endpoint; audit fields are server-owned.
const IMMUTABLE_FIELDS = ["status", "createdAt", "updatedAt", "id", "history"];

export interface UpdateTicketDeps {
  repository: TicketRepository;
}

const defaultDeps: UpdateTicketDeps = { repository: ticketRepository };

/** Partial update. Terminal tickets are read-only; status is immutable here. */
export async function updateTicket(
  rawId: unknown,
  input: unknown,
  deps: UpdateTicketDeps = defaultDeps,
): Promise<Ticket> {
  const id = ticketIdSchema.parse(rawId);
  assertNoImmutableFields(input);
  const data = updateTicketSchema.parse(input);
  const existing = await deps.repository.findById(id);
  if (!existing) {
    throw new NotFoundError("ticket", id);
  }
  if (TERMINAL_STATUSES.includes(existing.status)) {
    throw new CodedError(
      "TERMINAL_STATE",
      `Ticket in "${existing.status}" state cannot be edited`,
      409,
    );
  }
  return deps.repository.update(id, data);
}

function assertNoImmutableFields(input: unknown): void {
  if (typeof input !== "object" || input === null) {
    return;
  }
  const hit = IMMUTABLE_FIELDS.find((field) => field in input);
  if (hit) {
    throw new CodedError(
      "IMMUTABLE_FIELD",
      `Field "${hit}" cannot be edited directly. Use the transition endpoint for status changes.`,
      422,
    );
  }
}
