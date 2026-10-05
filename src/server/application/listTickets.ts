import { z } from "zod";

import type { Ticket } from "../domain/ticket";
import { ticketRepository } from "../composition";
import type { ListQuery, Page, TicketRepository } from "./ports";
import { categorySchema, prioritySchema, statusSchema } from "./ticketSchemas";

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  category: categorySchema.optional(),
  sort: z.enum(["createdAt", "updatedAt", "priority", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export interface ListTicketsDeps {
  repository: TicketRepository;
}

const defaultDeps: ListTicketsDeps = { repository: ticketRepository };

/** Validates the query, delegates filtering/sorting/pagination to the repository. */
export async function listTickets(
  input: unknown,
  deps: ListTicketsDeps = defaultDeps,
): Promise<Page<Ticket>> {
  const query: ListQuery = listQuerySchema.parse(input);
  return deps.repository.list(query);
}
