import { z } from "zod";

import { CATEGORIES, PRIORITIES, STATUSES } from "../domain/ticket";

// Boundary validation: every public input is parsed here, internal code trusts types.
export const categorySchema = z.enum(CATEGORIES);
export const prioritySchema = z.enum(PRIORITIES);
export const statusSchema = z.enum(STATUSES);

export const createTicketSchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(10).max(2000),
    requester: z.string().trim().min(2).max(80),
    requesterEmail: z.email().max(254).optional(),
    category: categorySchema,
    priority: prioritySchema,
  })
  // Unknown keys (e.g. a client-sent `status`) are stripped: creation is
  // always Pendiente, enforced by the use case, not by trusting the client.
  .strip();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "must be a valid identifier");

export const transitionSchema = z.object({
  to: statusSchema,
  actor: z.string().trim().min(2).max(80),
  observation: z.string().trim().max(1000).optional(),
});

export type TransitionInput = z.infer<typeof transitionSchema>;

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(5).max(120).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    requester: z.string().trim().min(2).max(80).optional(),
    requesterEmail: z.email().max(254).nullable().optional(),
    category: categorySchema.optional(),
    priority: prioritySchema.optional(),
  })
  .strip()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  });

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
