import type { SessionUser, UserRole } from "@soporte/shared";

/**
 * Tipos puros del cliente. No dependen de React, Next, ni de la capa de transporte.
 * Reflejan el contrato DTO que devolvera la API real (cookie httpOnly -> el cliente
 * solo conoce la sesion; el token nunca vive en JS ni en localStorage).
 */

export interface AuthUser extends SessionUser {
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  issuedAt: string;
  expiresAt: string;
}

export type AuthOutcome = AuthSession;
