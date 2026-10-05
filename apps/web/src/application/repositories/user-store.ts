import type { UserRole } from "@soporte/shared";

/**
 * Tienda de usuarios compartida por los repositorios en memoria.
 *
 * Vive aqui (no en `infrastructure/`) porque la capa de presentacion
 * solo debe cruzarse a infraestructura por `container.ts`. Como los
 * repositorios en memoria son detalles de la capa de aplicacion que
 * comparten estado, este modulo privado es la forma limpia de
 * unificarlo. Cuando llegue la API real, este archivo se borra.
 */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

const STORAGE_KEY = "__soporte_user_store__";

interface GlobalWithStore {
  [STORAGE_KEY]?: Map<string, StoredUser>;
}

function ensureSeeded(store: Map<string, StoredUser>) {
  if (store.size > 0) return;
  const now = new Date().toISOString();
  const seed: StoredUser[] = [
    {
      id: "u-admin",
      name: "Admin Demo",
      email: "admin@soporte.local",
      password: "admin1234",
      role: "ADMIN",
      createdAt: now,
    },
    {
      id: "u-demo",
      name: "Persona Demo",
      email: "demo@soporte.local",
      password: "demo1234",
      role: "USER",
      createdAt: now,
    },
    {
      id: "u-ana",
      name: "Ana Ríos",
      email: "ana@soporte.local",
      password: "ana12345",
      role: "USER",
      createdAt: now,
    },
    {
      id: "u-luis",
      name: "Luis Pardo",
      email: "luis@soporte.local",
      password: "luis1234",
      role: "USER",
      createdAt: now,
    },
    {
      id: "u-maria",
      name: "María Vélez",
      email: "maria@soporte.local",
      password: "maria123",
      role: "USER",
      createdAt: now,
    },
  ];
  for (const user of seed) store.set(user.id, user);
}

export function getUserStore(): Map<string, StoredUser> {
  const g = globalThis as unknown as GlobalWithStore;
  if (!g[STORAGE_KEY]) {
    g[STORAGE_KEY] = new Map();
  }
  ensureSeeded(g[STORAGE_KEY]);
  return g[STORAGE_KEY];
}
