import type { UserRole, UserSummary } from "@soporte/shared";

import {
  AuthorizationError,
  EmailAlreadyRegisteredError,
} from "../../errors.js";
import type {
  Clock,
  IdGenerator,
  PasswordHasher,
  UserRepository,
} from "../../ports/index.js";
import type { SessionUser } from "@soporte/shared";

export interface CreateUserInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: UserRole;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: alta de un usuario nuevo.
 * Reglas:
 *  - Solo `ADMIN` puede crear usuarios (lanza `AuthorizationError`).
 *  - Email debe ser unico (case-insensitive en BD via indice `lower(email)`).
 *  - La contrasena se hashea con el `PasswordHasher` inyectado.
 *  - El id lo genera el `IdGenerator`.
 *  - Devuelve un `UserSummary` listo para la respuesta HTTP.
 */
export class CreateUserUseCase {
  constructor(
    private readonly deps: {
      readonly users: UserRepository;
      readonly hasher: PasswordHasher;
      readonly clock: Clock;
      readonly ids: IdGenerator;
    },
  ) {}

  async execute(input: CreateUserInput): Promise<UserSummary> {
    if (input.actor.role !== "ADMIN") {
      throw new AuthorizationError("crear usuarios");
    }
    const existing = await this.deps.users.findByEmail(input.email);
    if (existing !== null) {
      throw new EmailAlreadyRegisteredError();
    }
    const id = this.deps.ids.generate();
    const now = this.deps.clock.now();
    const passwordHash = await this.deps.hasher.hash(input.password);

    const created = await this.deps.users.create({
      id,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      now,
    });

    return { id: created.id, name: created.name, email: created.email };
  }
}
