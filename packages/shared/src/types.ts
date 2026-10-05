import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "./enums.js";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface User extends UserSummary {
  role: UserRole;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requester: UserSummary;
  assignedTo: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  deletedAt: string | null;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  previousStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedBy: UserSummary;
  observation: string | null;
  createdAt: string;
}

export interface Page<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const SORTABLE_TICKET_FIELDS = [
  "createdAt",
  "updatedAt",
  "title",
  "priority",
  "status",
] as const;

export type SortableTicketField = (typeof SORTABLE_TICKET_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];
