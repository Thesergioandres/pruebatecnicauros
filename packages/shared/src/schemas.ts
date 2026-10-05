import { z } from "zod";

import {
  ticketCategorySchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from "./enums.js";
import {
  SORTABLE_TICKET_FIELDS,
  SORT_ORDERS,
} from "./types.js";

const textField = (message: string) =>
  z.string({
    required_error: message,
    invalid_type_error: "Debe ser un valor de texto",
  });

export const titleSchema = textField("El titulo es obligatorio")
  .trim()
  .min(5, "El titulo debe tener al menos 5 caracteres")
  .max(120, "El titulo no puede superar los 120 caracteres");

export const descriptionSchema = textField("La descripcion es obligatoria")
  .trim()
  .min(10, "La descripcion debe tener al menos 10 caracteres")
  .max(2000, "La descripcion no puede superar los 2000 caracteres");

export const observationSchema = textField("La observacion debe ser texto").trim().max(
  500,
  "La observacion no puede superar los 500 caracteres",
);

export const uuidSchema = z
  .string({ invalid_type_error: "Debe ser un identificador valido" })
  .uuid("Debe ser un identificador valido");

export const createTicketSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    category: ticketCategorySchema,
    priority: ticketPrioritySchema.default("MEDIA"),
    requesterId: uuidSchema.optional(),
    assignedToId: uuidSchema.nullish(),
  })
  .strict();

export const updateTicketSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    category: ticketCategorySchema.optional(),
    priority: ticketPrioritySchema.optional(),
    assignedToId: uuidSchema.nullish(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Debe enviarse al menos un campo para actualizar",
  });

export const changeTicketStatusSchema = z
  .object({
    status: ticketStatusSchema,
    observation: observationSchema.optional(),
  })
  .strict();

export const cancelTicketSchema = z
  .object({
    observation: observationSchema.optional(),
  })
  .strict();

export const registerSchema = z
  .object({
    name: textField("El nombre es obligatorio")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar los 80 caracteres"),
    email: textField("El email es obligatorio")
      .trim()
      .toLowerCase()
      .email("El email no tiene un formato valido")
      .max(160, "El email no puede superar los 160 caracteres"),
    password: textField("La contrasena es obligatoria")
      .min(8, "La contrasena debe tener al menos 8 caracteres")
      .max(72, "La contrasena no puede superar los 72 caracteres"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: textField("El email es obligatorio")
      .trim()
      .toLowerCase()
      .email("El email no tiene un formato valido"),
    password: textField("La contrasena es obligatoria").min(1),
  })
  .strict();

const booleanishSchema = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform(
    (value) => value === true || value === "true" || value === "1",
  );

export const paginationSchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "El numero de pagina debe ser numerico" })
    .int("El numero de pagina debe ser entero")
    .min(1, "El numero de pagina debe ser mayor o igual a 1")
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: "El tamano de pagina debe ser numerico" })
    .int("El tamano de pagina debe ser entero")
    .min(1, "El tamano de pagina debe ser mayor o igual a 1")
    .max(100, "El tamano de pagina no puede superar los 100 registros")
    .default(10),
});

export const listTicketsQuerySchema = paginationSchema.extend({
  search: textField("La busqueda debe ser texto").trim().min(1).max(200).optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
  requesterId: uuidSchema.optional(),
  sortBy: z.enum(SORTABLE_TICKET_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
  includeDeleted: booleanishSchema.default(false),
});

export const listUsersQuerySchema = paginationSchema.extend({
  search: textField("La busqueda debe ser texto").trim().min(1).max(200).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ChangeTicketStatusInput = z.infer<typeof changeTicketStatusSchema>;
export type CancelTicketInput = z.infer<typeof cancelTicketSchema>;
export type ListTicketsInput = z.infer<typeof listTicketsQuerySchema>;
export type ListUsersInput = z.infer<typeof listUsersQuerySchema>;
