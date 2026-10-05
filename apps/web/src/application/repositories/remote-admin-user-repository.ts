import type { UserRole } from "@soporte/shared";

import type { HttpClient } from "../../infrastructure/http-client.js";
import type {
  AdminUserRepository,
  AdminUserSummary,
  CreateAdminUserInput,
} from "../ports/admin-user-repository.js";

/**
 * Adaptador HTTP del puerto de gestion de usuarios (solo `ADMIN`).
 * Contrato:
 *  - `GET  /api/admin/users` -> `AdminUserSummary[]`
 *  - `POST /api/admin/users` -> `AdminUserSummary`
 *
 * El backend rellena `createdAt` y asigna el id; aqui solo se envia
 * el payload y se proyecta la respuesta al DTO que espera la UI.
 */

interface RemoteAdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

function toSummary(user: RemoteAdminUser): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt ?? new Date().toISOString(),
  };
}

export class RemoteAdminUserRepository implements AdminUserRepository {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<AdminUserSummary[]> {
    const users = await this.http.request<RemoteAdminUser[]>({
      method: "GET",
      url: "/api/admin/users",
    });
    return users.map(toSummary);
  }

  async create(input: CreateAdminUserInput): Promise<AdminUserSummary> {
    const user = await this.http.request<RemoteAdminUser>({
      method: "POST",
      url: "/api/admin/users",
      body: input,
    });
    return toSummary(user);
  }
}
