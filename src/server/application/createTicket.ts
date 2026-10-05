import type { Ticket } from "../domain/ticket";
import { notifier, ticketRepository } from "../composition";
import type { Notifier, TicketRepository } from "./ports";
import { createTicketSchema } from "./ticketSchemas";

export interface CreateTicketDeps {
  repository: TicketRepository;
  notifier: Notifier;
}

const defaultDeps: CreateTicketDeps = {
  repository: ticketRepository,
  notifier,
};

/** Validates input, persists with status Pendiente, notifies when possible. */
export async function createTicket(
  input: unknown,
  deps: CreateTicketDeps = defaultDeps,
): Promise<Ticket> {
  const data = createTicketSchema.parse(input);
  const ticket = await deps.repository.create(data);
  if (ticket.requesterEmail) {
    await deps.notifier.sendTicketCreated({
      ticketId: ticket.id,
      title: ticket.title,
      to: ticket.requesterEmail,
      requester: ticket.requester,
    });
  }
  return ticket;
}
