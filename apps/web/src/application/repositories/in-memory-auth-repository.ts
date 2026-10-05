import {
  ERROR_CODES,
  type ApiErrorBody,
  type LoginInput,
  type RegisterInput,
} from "@soporte/shared";

import type { AuthSession } from "../../domain/auth.js";
import { HttpError } from "../../infrastructure/http-client.js";
import { getUserStore } from "./user-store.js";
import type { AuthRepository } from "../ports/auth-repository.js";

/**
 * Implementacion en memoria del puerto de autenticacion.
 *
 * Replica el contrato DTO que entregara la API real
 * (`AuthSession` con `user`, `issuedAt`, `expiresAt`) y replica
 * los codigos de error tipados de `packages/shared/src/errors.ts`
 * (`INVALID_CREDENTIALS`, `EMAIL_ALREADY_REGISTERED`).
 *
 * La tienda de usuarios es la misma que usa el panel admin, asi
 * un usuario creado desde alli puede iniciar sesion de inmediato.
 * Cuando la API real este lista se sustituye por un
 * `RemoteAuthRepository` en `infrastructure/` que use `httpClient`
 * (cookie httpOnly, same-origin).
 *
 * Reglas del mock (solo para demo del shell):
 *  - Cualquier contrasena que no sea literalmente `wrongpass` pasa
 *    la validacion de credenciales.
 *  - `register` (no se usa en la UI: el registro es interno del admin)
 *    valida que el email no exista.
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h, igual que SESSION_TTL_HOURS

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildSession(
  user: { id: string; name: string; email: string; role: "ADMIN" | "USER" },
): AuthSession {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function failWith(
  code: keyof typeof ERROR_CODES,
  message: string,
  status: number,
  details?: ApiErrorBody["error"]["details"],
): never {
  throw new HttpError(status, ERROR_CODES[code], message, details);
}

function findByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  for (const user of getUserStore().values()) {
    if (user.email === normalized) return user;
  }
  return null;
}

export class InMemoryAuthRepository implements AuthRepository {
  async login(input: LoginInput): Promise<AuthSession> {
    await delay(450);

    if (input.password === "wrongpass") {
      failWith("INVALID_CREDENTIALS", "Email o contrasena incorrectos.", 401);
    }

    const account = findByEmail(input.email);
    if (!account) {
      failWith("INVALID_CREDENTIALS", "Email o contrasena incorrectos.", 401);
    }
    if (account.password !== input.password) {
      failWith("INVALID_CREDENTIALS", "Email o contrasena incorrectos.", 401);
    }
    return buildSession(account);
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    await delay(500);

    if (findByEmail(input.email)) {
      failWith(
        "EMAIL_ALREADY_REGISTERED",
        "Ya existe una cuenta registrada con ese email.",
        409,
      );
    }

    // El registro publico ya no existe en la UI. Este metodo queda como
    // adaptador para el caso legacy o tests, pero no se invoca desde
    // ninguna pantalla del shell.
    failWith(
      "FORBIDDEN",
      "El registro publico esta deshabilitado. Pide a un administrador que cree la cuenta.",
      403,
    );
  }

  async logout(): Promise<void> {
    await delay(150);
  }

  // El mock no persiste sesion: tras un reload siempre devuelve `null`,
  // asi la UI redirige a /login. En la API real este metodo llama a
  // `GET /api/auth/me` que respeta la cookie httpOnly.
  async getCurrentSession(): Promise<AuthSession | null> {
    await delay(50);
    return null;
  }
}
