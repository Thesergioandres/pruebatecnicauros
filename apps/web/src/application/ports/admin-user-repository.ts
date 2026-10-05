import type { UserRole } from "@soporte/shared";

// Resumen publico de un usuario (sin password_hash) para listados y
// selectores. Reutilizamos el tipo de shared para no duplicar contrato.
export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Puerto de gestion de usuarios. Solo lo consume el panel admin.
 * En la API real vivira detras de un middleware de autorizacion
 * que compruebe que el llamante es `ADMIN`; el mock no lo verifica
 * porque la guarda client-side ya limita el acceso al grupo `(admin)`.
 */
export interface AdminUserRepository {
  list(): Promise<AdminUserSummary[]>;
  create(input: CreateAdminUserInput): Promise<AdminUserSummary>;
}
