import { ticketRepository } from "../composition";
import { NotFoundError } from "./errors";
import type { TicketRepository } from "./ports";
import { ticketIdSchema } from "./ticketSchemas";

export interface DeleteTicketDeps {
  repository: TicketRepository;
}

const defaultDeps: DeleteTicketDeps = { repository: ticketRepository };

/** Physical delete. Prefer the Cancelada transition for logical deletion. */
export async function deleteTicket(
  rawId: unknown,
  deps: DeleteTicketDeps = defaultDeps,
): Promise<void> {
  const id = ticketIdSchema.parse(rawId);
  const existing = await deps.repository.findById(id);
  if (!existing) {
    throw new NotFoundError("ticket", id);
  }
  await deps.repository.delete(id);
}
