import type {
  Page,
  Ticket,
  TicketCategory,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
  UserSummary,
} from "@soporte/shared";

/**
 * Repository ports. The domain declares the contract; the infrastructure
 * layer provides the concrete implementation (PostgreSQL, in-memory, etc.).
 * Application/use cases depend only on these interfaces.
 */

export interface ListTicketsQuery {
  readonly search?: string;
  readonly status?: TicketStatus;
  readonly priority?: TicketPriority;
  readonly category?: TicketCategory;
  readonly requesterId?: string;
  readonly sortBy?: "createdAt" | "updatedAt" | "title" | "priority" | "status";
  readonly sortOrder?: "asc" | "desc";
  readonly page?: number;
  readonly pageSize?: number;
  readonly includeDeleted?: boolean;
}

export interface UpdateTicketPatch {
  readonly title?: string;
  readonly description?: string;
  readonly category?: TicketCategory;
  readonly priority?: TicketPriority;
  readonly assignedToId?: string | null;
}

export interface TicketRepository {
  findById(id: string): Promise<Ticket | null>;
  list(query: ListTicketsQuery): Promise<Page<Ticket>>;
  save(ticket: Ticket): Promise<Ticket>;
  update(id: string, changes: UpdateTicketPatch, now: string): Promise<Ticket>;
  softDelete(id: string, now: string): Promise<void>;
}

export interface NewHistoryEntry {
  readonly ticketId: string;
  readonly previousStatus: TicketStatus | null;
  readonly newStatus: TicketStatus;
  readonly changedBy: UserSummary;
  readonly observation: string | null;
  readonly createdAt: string;
}

export interface TicketHistoryRepository {
  listByTicket(
    ticketId: string,
    pagination: { readonly page: number; readonly pageSize: number },
  ): Promise<Page<TicketHistoryEntry>>;
  append(entry: NewHistoryEntry): Promise<TicketHistoryEntry>;
}

export interface UserDirectory {
  findById(id: string): Promise<UserSummary | null>;
  list(): Promise<UserSummary[]>;
}

/**
 * Port for the wall clock. The infrastructure implementation returns the
 * real current time; tests and the seed script can inject a fixed one.
 */
export interface Clock {
  now(): string;
}
