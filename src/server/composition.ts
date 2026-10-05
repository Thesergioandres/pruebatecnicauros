import type { Notifier, TicketRepository } from "./application/ports";
import { prismaTicketRepository } from "./infrastructure/ticketRepository";
import { ResendNotifier } from "./infrastructure/mail/resendNotifier";

// Composition root: the only place that wires ports to adapters.
// Tests replace `notifier` with a spy and hit the real test database.
export const ticketRepository: TicketRepository = prismaTicketRepository;
export const notifier: Notifier = new ResendNotifier();
