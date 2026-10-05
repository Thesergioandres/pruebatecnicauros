import { z } from "zod";

export const TICKET_CATEGORIES = [
  "HARDWARE",
  "SOFTWARE",
  "RED",
  "ACCESOS",
  "OTROS",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const ticketCategorySchema = z.enum(TICKET_CATEGORIES);

export const TICKET_PRIORITIES = ["BAJA", "MEDIA", "ALTA", "CRITICA"] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES);

export const TICKET_STATUSES = [
  "PENDIENTE",
  "EN_PROGRESO",
  "RESUELTA",
  "CANCELADA",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const ticketStatusSchema = z.enum(TICKET_STATUSES);

export const USER_ROLES = ["ADMIN", "USER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const userRoleSchema = z.enum(USER_ROLES);
