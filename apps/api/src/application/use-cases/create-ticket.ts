import type {
  Ticket,
  TicketCategory,
  TicketPriority,
  UserSummary,
} from "@soporte/shared";

import { buildNewTicket } from "../../domain/ticket.js";
import { NotFoundError } from "../errors.js";
import type {
  Clock,
  IdGenerator,
  Notifier,
  TicketRepository,
  UserDirectory,
} from "../ports/index.js";

export interface CreateTicketInput {
  readonly title: string;
  readonly description: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly requesterId?: string;
  readonly assignedToId?: string | null;
  readonly actor: UserSummary;
}

/**
 * Caso de uso: crea un ticket nuevo.
 * Reglas:
 *  - Si no se indica `requesterId`, se toma el usuario de la sesion.
 *  - Si se indica `assignedToId`, el usuario responsable debe existir.
 *  - La validacion de titulo/descripcion la hace la capa de dominio
 *    dentro de `buildNewTicket`.
 *  - Tras guardar, dispara una notificacion por email al destinatario
 *    configurado en `NOTIFY_NEW_TICKET_TO`. El envio es
 *    envio no bloqueante: si falla, la operacion sigue verde.
 */
export class CreateTicketUseCase {
  constructor(
    private readonly deps: {
      readonly tickets: TicketRepository;
      readonly users: UserDirectory;
      readonly clock: Clock;
      readonly ids: IdGenerator;
      readonly notifier: Notifier;
    },
  ) {}

  async execute(input: CreateTicketInput): Promise<Ticket> {
    const requesterId = input.requesterId ?? input.actor.id;
    const requester = await this.deps.users.findById(requesterId);
    if (requester === null) {
      throw new NotFoundError("Usuario", requesterId);
    }

    let assignedTo: UserSummary | null = null;
    if (input.assignedToId !== undefined && input.assignedToId !== null) {
      const found = await this.deps.users.findById(input.assignedToId);
      if (found === null) {
        throw new NotFoundError("Usuario", input.assignedToId);
      }
      assignedTo = found;
    }

    const now = this.deps.clock.now();
    const ticket = buildNewTicket({
      id: this.deps.ids.generate(),
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      requester,
      assignedTo,
      now,
    });

    const saved = await this.deps.tickets.save(ticket);
    // Notificacion envio no bloqueante: el notifier nunca lanza hacia el caller.
    this.deps.notifier.notifyTicketCreated(saved);
    return saved;
  }
}
