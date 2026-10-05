import type { SessionUser, Ticket } from "@soporte/shared";

import type {
  ChangeTicketStatusInput,
  ChangeTicketStatusUseCase,
} from "./change-ticket-status.js";

export interface CancelTicketInput {
  readonly id: string;
  readonly observation: string | null;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: atajo de cancelacion. Delega en `ChangeTicketStatusUseCase`
 * forzando el destino a `CANCELADA`. Toda la validacion (estado terminal
 * previo, observacion si aplica) la aplica la politica del dominio.
 */
export class CancelTicketUseCase {
  constructor(
    private readonly changeStatus: ChangeTicketStatusUseCase,
  ) {}

  async execute(input: CancelTicketInput): Promise<Ticket> {
    const change: ChangeTicketStatusInput = {
      id: input.id,
      newStatus: "CANCELADA",
      observation: input.observation,
      actor: input.actor,
    };
    return this.changeStatus.execute(change);
  }
}
