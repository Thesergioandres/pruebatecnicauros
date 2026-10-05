import type { LoginInput, RegisterInput, UserRole } from "@soporte/shared";

import type { AuthSession } from "../../domain/auth.js";
import type { HttpClient } from "../../infrastructure/http-client.js";
import type { AuthRepository } from "../ports/auth-repository.js";

/**
 * Adaptador HTTP del puerto de autenticacion. Todas las llamadas van
 * same-origin (`/api/...`) y reusan el `httpClient` (cookie httpOnly,
 * `credentials: include`).
 *
 * Contrato esperado (alineado con `tasks/plan.md`):
 *  - `POST /api/auth/login`  -> 204 (solo setea la cookie de sesion)
 *  - `POST /api/auth/logout` -> 204
 *  - `GET  /api/auth/me`     -> `SessionUser` (o 401 si no hay sesion)
 *
 * Como el backend no devuelve el usuario en el body del login, el
 * adaptador hace una segunda llamada a `/api/auth/me` para obtener
 * los datos de la sesion. Asi el puerto `AuthRepository` mantiene
 * su forma (`AuthSession`) independientemente del detalle de transporte.
 *
 * El registro publico esta deshabilitado en el spec actual; `register`
 * lanza `FORBIDDEN` para mantener el contrato del puerto.
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function buildSession(
  user: { id: string; name: string; email: string; role: UserRole },
  issuedAt: Date = new Date(),
): AuthSession {
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + SESSION_TTL_MS).toISOString(),
  };
}

export class RemoteAuthRepository implements AuthRepository {
  constructor(private readonly http: HttpClient) {}

  async login(input: LoginInput): Promise<AuthSession> {
    await this.http.request<null>({
      method: "POST",
      url: "/api/auth/login",
      body: input,
    });
    // El backend setea la cookie httpOnly en el response del login.
    // Recuperamos el usuario recien autenticado via `/me`.
    const user = await this.fetchCurrentUser();
    return buildSession(user);
  }

  async register(_input: RegisterInput): Promise<AuthSession> {
    throw new Error("El registro publico esta deshabilitado.");
  }

  async logout(): Promise<void> {
    await this.http.request<null>({
      method: "POST",
      url: "/api/auth/logout",
    });
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const user = await this.fetchCurrentUser();
      return buildSession(user);
    } catch {
      return null;
    }
  }

  private async fetchCurrentUser(): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }> {
    return this.http.request<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
    }>({
      method: "GET",
      url: "/api/auth/me",
    });
  }
}
