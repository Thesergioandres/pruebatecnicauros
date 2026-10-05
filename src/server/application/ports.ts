import type {
  HistoryEntry,
  NewTicketData,
  Ticket,
  TicketStatus,
} from "../domain/ticket";

/** Outbound port: persistence. Implemented by the Prisma adapter. */
export interface TicketRepository {
  create(data: NewTicketData): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  recordTransition(entry: {
    ticketId: string;
    fromStatus: TicketStatus;
    toStatus: TicketStatus;
    actor: string;
    observation?: string;
  }): Promise<{ ticket: Ticket; history: HistoryEntry }>;
}

export interface TicketCreatedEvent {
  ticketId: string;
  title: string;
  to: string;
  requester: string;
}

export interface StatusChangedEvent {
  ticketId: string;
  title: string;
  to: string;
  fromStatus: string;
  toStatus: string;
  actor: string;
  observation?: string;
}

/** Outbound port: notifications. Implemented by Resend, faked in tests. */
export interface Notifier {
  sendTicketCreated(event: TicketCreatedEvent): Promise<void>;
  sendStatusChanged(event: StatusChangedEvent): Promise<void>;
}
