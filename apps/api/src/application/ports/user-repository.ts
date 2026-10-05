import type { UserRole, UserSummary } from "@soporte/shared";

/**
 * Registro de usuario tal como se almacena. Solo la capa de aplicacion
 * necesita la fila completa (con password_hash); el resto del sistema
 * trabaja con `UserSummary`/`User`.
 */
export interface UserRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly createdAt: string;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly passwordHash: string;
    readonly role: UserRole;
    readonly now: string;
  }): Promise<UserRecord>;
  list(): Promise<UserSummary[]>;
}
