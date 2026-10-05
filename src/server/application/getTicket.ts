import type { HistoryEntry, Ticket } from "../domain/ticket";
import { ticketRepository } from "../composition";
import { NotFoundError } from "./errors";
import type { TicketRepository } from "./ports";
import { ticketIdSchema } from "./ticketSchemas";

export interface GetTicketDeps {
  repository: TicketRepository;
}

const defaultDeps: GetTicketDeps = { repository: ticketRepository };

export interface TicketDetail {
  ticket: Ticket;
  history: HistoryEntry[];
}

/** Returns the ticket with its status history, oldest first. */
export async function getTicketById(
  rawId: unknown,
  deps: GetTicketDeps = defaultDeps,
): Promise<TicketDetail> {
  const id = ticketIdSchema.parse(rawId);
  const found = await deps.repository.findByIdWithHistory(id);
  if (!found) {
    throw new NotFoundError("ticket", id);
  }
  return found;
}
