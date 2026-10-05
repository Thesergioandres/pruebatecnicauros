import {
  ERROR_CODES,
  type UserRole,
} from "@soporte/shared";

import { HttpError } from "../../infrastructure/http-client.js";
import { getUserStore } from "./user-store.js";
import type {
  AdminUserRepository,
  AdminUserSummary,
  CreateAdminUserInput,
} from "../ports/admin-user-repository.js";

/**
 * Implementacion en memoria del puerto de gestion de usuarios.
 *
 * Replica el contrato DTO que entregara `GET /api/admin/users` y
 * `POST /api/admin/users` en la API real. Mismo codigo de error
 * (`EMAIL_ALREADY_REGISTERED`) para que la UI no se tenga que
 * adaptar al cambiar la implementacion.
 *
 * Comparte la tienda de usuarios con el repositorio de autenticacion,
 * asi los usuarios creados aqui pueden iniciar sesion de inmediato.
 */

function toSummary(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `u-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failWith(
  code: keyof typeof ERROR_CODES,
  message: string,
  status: number,
  details?: { path: string; message: string }[],
): never {
  throw new HttpError(status, ERROR_CODES[code], message, details);
}

export class InMemoryAdminUserRepository implements AdminUserRepository {
  async list(): Promise<AdminUserSummary[]> {
    await delay(120);
    return Array.from(getUserStore().values())
      .map(toSummary)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async create(input: CreateAdminUserInput): Promise<AdminUserSummary> {
    await delay(220);
    const store = getUserStore();
    const email = input.email.trim().toLowerCase();
    for (const user of store.values()) {
      if (user.email === email) {
        failWith(
          "EMAIL_ALREADY_REGISTERED",
          "Ya existe una cuenta registrada con ese email.",
          409,
          [{ path: "email", message: "El email ya esta registrado." }],
        );
      }
    }
    const id = newId();
    const created = {
      id,
      name: input.name.trim(),
      email,
      password: input.password,
      role: input.role,
      createdAt: new Date().toISOString(),
    };
    store.set(id, created);
    return toSummary(created);
  }
}
