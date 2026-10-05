import { assertTransition } from "../domain/ticket";
import type { HistoryEntry, Ticket } from "../domain/ticket";
import { notifier, ticketRepository } from "../composition";
import { NotFoundError } from "./errors";
import type { Notifier, TicketRepository } from "./ports";
import { ticketIdSchema, transitionSchema } from "./ticketSchemas";

export interface TransitionTicketDeps {
  repository: TicketRepository;
  notifier: Notifier;
}

const defaultDeps: TransitionTicketDeps = {
  repository: ticketRepository,
  notifier,
};

export interface TransitionResult {
  ticket: Ticket;
  history: HistoryEntry;
}

/** Applies the state machine, persists ticket + history atomically, notifies. */
export async function transitionTicket(
  rawId: unknown,
  input: unknown,
  deps: TransitionTicketDeps = defaultDeps,
): Promise<TransitionResult> {
  const id = ticketIdSchema.parse(rawId);
  const data = transitionSchema.parse(input);
  const existing = await deps.repository.findById(id);
  if (!existing) {
    throw new NotFoundError("ticket", id);
  }
  assertTransition(existing.status, data.to, {
    priority: existing.priority,
    observation: data.observation,
  });
  const result = await deps.repository.recordTransition({
    ticketId: id,
    fromStatus: existing.status,
    toStatus: data.to,
    actor: data.actor,
    observation: data.observation,
  });
  if (result.ticket.requesterEmail) {
    await deps.notifier.sendStatusChanged({
      ticketId: result.ticket.id,
      title: result.ticket.title,
      to: result.ticket.requesterEmail,
      fromStatus: existing.status,
      toStatus: data.to,
      actor: data.actor,
      observation: data.observation,
    });
  }
  return result;
}
