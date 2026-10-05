import {
  ERROR_CODES,
  type ApiErrorBody,
  type LoginInput,
  type RegisterInput,
} from "@soporte/shared";

import type { AuthSession } from "../../domain/auth.js";
import { HttpError } from "../../infrastructure/http-client.js";
import type { AuthRepository } from "../ports/auth-repository.js";

/**
 * Implementacion en memoria del puerto de autenticacion.
 *
 * El shell se entrega sin API disponible (lanes A/B la construyen en paralelo),
 * asi que este adapter devuelve la misma forma DTO que entregara la API real
 * (`AuthSession` con `user`, `issuedAt`, `expiresAt`) y replica los codigos de
 * error tipados de `packages/shared/src/errors.ts` (`INVALID_CREDENTIALS`,
 * `EMAIL_ALREADY_REGISTERED`).
 *
 * Cuando la API real este lista se sustituye por un `RemoteAuthRepository` en
 * `infrastructure/` que use `httpClient` (cookie httpOnly, same-origin).
 *
 * Reglas del mock (solo para demo del shell):
 *  - Cualquier email con contrasena valida (>7 chars) inicia sesion.
 *  - Email `taken@soporte.local` simula cuenta ya registrada (409).
 *  - Contrasena literal `wrongpass` simula credenciales invalidas (401).
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8h, igual que SESSION_TTL_HOURS

const KNOWN_ACCOUNTS = new Map<string, { name: string; password: string }>([
  ["demo@soporte.local", { name: "Persona Demo", password: "demo1234" }],
  ["admin@soporte.local", { name: "Admin Demo", password: "admin1234" }],
]);

const TAKEN_EMAILS = new Set<string>(["taken@soporte.local"]);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SESSION_USER_POOL = new Map<string, string>(); // email -> id

function ensureUserId(email: string): string {
  let id = SESSION_USER_POOL.get(email);
  if (!id) {
    id = crypto.randomUUID();
    SESSION_USER_POOL.set(email, id);
  }
  return id;
}

function buildSession(email: string, name: string): AuthSession {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_MS);
  return {
    user: {
      id: ensureUserId(email),
      name,
      email,
      role: email.startsWith("admin") ? "ADMIN" : "USER",
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

export class InMemoryAuthRepository implements AuthRepository {
  async login(input: LoginInput): Promise<AuthSession> {
    await delay(450);

    if (input.password === "wrongpass") {
      failWith("INVALID_CREDENTIALS", "Email o contrasena incorrectos.", 401);
    }

    const account = KNOWN_ACCOUNTS.get(input.email);
    const name = account?.name ?? input.email.split("@")[0] ?? "Usuario";
    return buildSession(input.email, name);
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    await delay(500);

    if (TAKEN_EMAILS.has(input.email)) {
      failWith(
        "EMAIL_ALREADY_REGISTERED",
        "Ya existe una cuenta registrada con ese email.",
        409,
      );
    }

    if (KNOWN_ACCOUNTS.has(input.email)) {
      failWith(
        "EMAIL_ALREADY_REGISTERED",
        "Ya existe una cuenta registrada con ese email.",
        409,
      );
    }

    KNOWN_ACCOUNTS.set(input.email, { name: input.name, password: input.password });
    return buildSession(input.email, input.name);
  }

  async logout(): Promise<void> {
    await delay(150);
  }
}
