import type {
  Category,
  HistoryEntry,
  NewTicketData,
  Priority,
  Ticket,
  TicketStatus,
} from "../domain/ticket";

export interface ListQuery {
  q?: string;
  status?: TicketStatus;
  priority?: Priority;
  category?: Category;
  sort: "createdAt" | "updatedAt" | "priority" | "title";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Outbound port: persistence. Implemented by the Prisma adapter. */
export interface TicketRepository {
  create(data: NewTicketData): Promise<Ticket>;
  list(query: ListQuery): Promise<Page<Ticket>>;
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
