import type { UserRole } from "@soporte/shared";
import { z } from "zod";

/**
 * Tipos y validacion para el panel admin de usuarios.
 * No expone `passwordHash`: la password viaja una sola vez al crearse.
 */

const textField = (message: string) =>
  z.string({ required_error: message, invalid_type_error: "Debe ser un valor de texto" });

export const ADMIN_USER_ROLES = ["ADMIN", "USER"] as const;

export const createAdminUserSchema = z
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
    role: z.enum(ADMIN_USER_ROLES, {
      required_error: "Selecciona un rol",
      invalid_type_error: "Rol invalido",
    }),
  })
  .strict();

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  USER: "Cliente",
};
