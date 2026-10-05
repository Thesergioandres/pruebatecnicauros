/**
 * seed.ts
 *
 * Inserta datos minimos de desarrollo:
 *   - 2 usuarios (admin + user), contrasenas hasheadas con bcrypt.
 *   - 6 tickets variados en categoria/prioridad/estado, cada uno con al menos
 *     una entrada en ticket_history que documenta su creacion.
 *
 * Es idempotente: los IDs son deterministas (UUID fijos) y se usa
 * `ON CONFLICT (id) DO NOTHING`. Re-ejecutar el script no produce duplicados.
 *
 * Variables de entorno:
 *   SEED_ADMIN_EMAIL / SEED_USER_EMAIL  (opcional; defaults dev)
 *   SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD  (obligatorio en prod)
 *
 * Uso:
 *   npm run db:seed --workspace @soporte/api
 */

import bcrypt from "bcryptjs";

import { closePool, getPool, withTransaction } from "../pool.js";
import { loadDatabaseConfig } from "../config.js";
import type {
  TicketCategoryCode,
  TicketHistoryRow,
  TicketPriorityCode,
  TicketRow,
  TicketStatusCode,
  UserRoleCode,
  UserRow,
} from "../types.js";

const BCRYPT_ROUNDS = 10;

interface SeedUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: UserRoleCode;
}

interface SeedHistory {
  readonly id: string;
  readonly ticketId: string;
  readonly previousStatus: TicketStatusCode | null;
  readonly newStatus: TicketStatusCode;
  readonly changedById: string;
  readonly observation: string | null;
  /** Días hacia atrás desde hoy (entero, puede ser negativo). */
  readonly daysAgo: number;
  /** Horas del día (0-23) para el timestamp exacto, determinista. */
  readonly hour: number;
}

interface SeedTicket {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: TicketCategoryCode;
  readonly priority: TicketPriorityCode;
  readonly priorityWeight: 0 | 1 | 2 | 3;
  readonly status: TicketStatusCode;
  readonly requesterId: string;
  readonly assignedToId: string | null;
  readonly history: readonly SeedHistory[];
}

const ADMIN_ID = "00000000-0000-5000-a000-000000000001";
const USER_ID = "00000000-0000-5000-a000-000000000002";

const DEFAULT_ADMIN_EMAIL = "admin@soporte.local";
const DEFAULT_USER_EMAIL = "user@soporte.local";
const DEFAULT_ADMIN_PASSWORD = "admin1234";
const DEFAULT_USER_PASSWORD = "user1234";

function readEnvOr(key: string, fallback: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return fallback;
  return value;
}

function buildUsers(): readonly SeedUser[] {
  return [
    {
      id: ADMIN_ID,
      name: "Ada Admin",
      email: readEnvOr("SEED_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL),
      password: readEnvOr("SEED_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD),
      role: "ADMIN",
    },
    {
      id: USER_ID,
      name: "Ursula User",
      email: readEnvOr("SEED_USER_EMAIL", DEFAULT_USER_EMAIL),
      password: readEnvOr("SEED_USER_PASSWORD", DEFAULT_USER_PASSWORD),
      role: "USER",
    },
  ];
}

function buildTickets(): readonly SeedTicket[] {
  return [
    {
      id: "00000000-0000-5000-b000-000000000001",
      title: "El equipo no enciende tras update de firmware",
      description:
        "Desde la actualizacion automatica de firmware el equipo de mesa del area de contabilidad no responde. Probamos boton de encendido durante 30 segundos sin resultado.",
      category: "HARDWARE",
      priority: "ALTA",
      priorityWeight: 2,
      status: "PENDIENTE",
      requesterId: USER_ID,
      assignedToId: null,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000001",
          ticketId: "00000000-0000-5000-b000-000000000001",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: USER_ID,
          observation: "Ticket creado desde portal de soporte",
          daysAgo: 2,
          hour: 9,
        },
      ],
    },
    {
      id: "00000000-0000-5000-b000-000000000002",
      title: "Outlook no descarga adjuntos PDF",
      description:
        "Al abrir adjuntos PDF desde Outlook desktop aparece error 'No se puede abrir el archivo'. Reiniciar Outlook no soluciona el problema.",
      category: "SOFTWARE",
      priority: "MEDIA",
      priorityWeight: 1,
      status: "EN_PROGRESO",
      requesterId: USER_ID,
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000002",
          ticketId: "00000000-0000-5000-b000-000000000002",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: USER_ID,
          observation: "Ticket creado desde portal de soporte",
          daysAgo: 5,
          hour: 11,
        },
        {
          id: "00000000-0000-5000-c000-000000000003",
          ticketId: "00000000-0000-5000-b000-000000000002",
          previousStatus: "PENDIENTE",
          newStatus: "EN_PROGRESO",
          changedById: ADMIN_ID,
          observation: "Asignado y en revision con soporte externo de Microsoft",
          daysAgo: 4,
          hour: 15,
        },
      ],
    },
    {
      id: "00000000-0000-5000-b000-000000000003",
      title: "Caida total de conectividad en oficina central",
      description:
        "Desde las 08:30 no tenemos acceso a internet ni a la VPN corporativa. Ningun equipo de la planta puede operar. Urgente.",
      category: "RED",
      priority: "CRITICA",
      priorityWeight: 3,
      status: "EN_PROGRESO",
      requesterId: USER_ID,
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000004",
          ticketId: "00000000-0000-5000-b000-000000000003",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: USER_ID,
          observation: "Reporte de incidente masivo",
          daysAgo: 1,
          hour: 8,
        },
        {
          id: "00000000-0000-5000-c000-000000000005",
          ticketId: "00000000-0000-5000-b000-000000000003",
          previousStatus: "PENDIENTE",
          newStatus: "EN_PROGRESO",
          changedById: ADMIN_ID,
          observation: "Escalado a proveedor ISP; pruebas con enlace backup",
          daysAgo: 1,
          hour: 9,
        },
      ],
    },
    {
      id: "00000000-0000-5000-b000-000000000004",
      title: "Resetear contrasena del portal de proveedores",
      description:
        "El usuario del area de compras no puede ingresar al portal de proveedores. Solicita restablecimiento de contrasena.",
      category: "ACCESOS",
      priority: "BAJA",
      priorityWeight: 0,
      status: "RESUELTA",
      requesterId: USER_ID,
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000006",
          ticketId: "00000000-0000-5000-b000-000000000004",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: USER_ID,
          observation: "Ticket creado desde portal de soporte",
          daysAgo: 10,
          hour: 10,
        },
        {
          id: "00000000-0000-5000-c000-000000000007",
          ticketId: "00000000-0000-5000-b000-000000000004",
          previousStatus: "PENDIENTE",
          newStatus: "EN_PROGRESO",
          changedById: ADMIN_ID,
          observation: "Validando identidad por canal alternativo",
          daysAgo: 9,
          hour: 12,
        },
        {
          id: "00000000-0000-5000-c000-000000000008",
          ticketId: "00000000-0000-5000-b000-000000000004",
          previousStatus: "EN_PROGRESO",
          newStatus: "RESUELTA",
          changedById: ADMIN_ID,
          observation: "Contrasena restablecida y enviada por canal seguro",
          daysAgo: 8,
          hour: 16,
        },
      ],
    },
    {
      id: "00000000-0000-5000-b000-000000000005",
      title: "Instalar paquete ofimatico en nuevo equipo",
      description:
        "Se entrego laptop nueva al area de diseno y requiere instalacion de suite ofimatica y herramientas de diseno estandar.",
      category: "SOFTWARE",
      priority: "ALTA",
      priorityWeight: 2,
      status: "PENDIENTE",
      requesterId: USER_ID,
      assignedToId: null,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000009",
          ticketId: "00000000-0000-5000-b000-000000000005",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: USER_ID,
          observation: "Ticket creado desde portal de soporte",
          daysAgo: 0,
          hour: 8,
        },
      ],
    },
    {
      id: "00000000-0000-5000-b000-000000000006",
      title: "Consulta sobre politica de respaldos",
      description:
        "El area legal pregunta con que frecuencia se respaldan los archivos del servidor de documentos y donde se almacenan.",
      category: "OTROS",
      priority: "MEDIA",
      priorityWeight: 1,
      status: "CANCELADA",
      requesterId: USER_ID,
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-00000000000a",
          ticketId: "00000000-0000-5000-b000-000000000006",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: USER_ID,
          observation: "Ticket creado desde portal de soporte",
          daysAgo: 7,
          hour: 14,
        },
        {
          id: "00000000-0000-5000-c000-00000000000b",
          ticketId: "00000000-0000-5000-b000-000000000006",
          previousStatus: "PENDIENTE",
          newStatus: "CANCELADA",
          changedById: ADMIN_ID,
          observation: "Duplicado: ya se respondio por correo directo",
          daysAgo: 6,
          hour: 10,
        },
      ],
    },
  ];
}

function offsetDate(daysAgo: number, hour: number): Date {
  const now = new Date();
  // Truncar a las `hour:00:00.000Z` del dia `daysAgo` dias atras.
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysAgo,
      hour,
      0,
      0,
      0,
    ),
  );
  return target;
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function insertUsers(users: readonly SeedUser[]): Promise<number> {
  let inserted = 0;
  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    const result = await getPool().query<UserRow>(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [user.id, user.name, user.email, passwordHash, user.role],
    );
    if ((result.rowCount ?? 0) > 0) inserted += 1;
  }
  return inserted;
}

async function insertTicket(ticket: SeedTicket): Promise<boolean> {
  return withTransaction(async (client) => {
    const createdAt = offsetDate(
      ticket.history[0]?.daysAgo ?? 0,
      ticket.history[0]?.hour ?? 9,
    );
    const updatedAt = ticket.history.at(-1) === undefined
      ? createdAt
      : offsetDate(
          ticket.history.at(-1)!.daysAgo,
          ticket.history.at(-1)!.hour,
        );
    const resolvedAt = ticket.status === "RESUELTA" ? updatedAt : null;
    const ticketResult = await client.query<TicketRow>(
      `INSERT INTO tickets (
         id, title, description, category, priority, priority_weight,
         status, requester_id, assigned_to_id, created_at, updated_at, resolved_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.priority,
        ticket.priorityWeight,
        ticket.status,
        ticket.requesterId,
        ticket.assignedToId,
        createdAt,
        updatedAt,
        resolvedAt,
      ],
    );
    if ((ticketResult.rowCount ?? 0) === 0) {
      // Ya existia: no reinsertamos historial (preserva eventos reales).
      return false;
    }
    for (const entry of ticket.history) {
      const ts = offsetDate(entry.daysAgo, entry.hour);
      await client.query<TicketHistoryRow>(
        `INSERT INTO ticket_history (
           id, ticket_id, previous_status, new_status, changed_by_id, observation, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          entry.id,
          ticket.id,
          entry.previousStatus,
          entry.newStatus,
          entry.changedById,
          entry.observation,
          ts,
        ],
      );
    }
    return true;
  });
}

async function main(): Promise<void> {
  loadDatabaseConfig();
  const users = buildUsers();
  const tickets = buildTickets();

  const usersInserted = await insertUsers(users);
  // eslint-disable-next-line no-console
  console.log(`[seed] users: ${usersInserted} nuevo(s), ${users.length - usersInserted} ya existente(s)`);

  let ticketsInserted = 0;
  for (const ticket of tickets) {
    const inserted = await insertTicket(ticket);
    if (inserted) ticketsInserted += 1;
  }
  // eslint-disable-next-line no-console
  console.log(
    `[seed] tickets: ${ticketsInserted} nuevo(s), ${tickets.length - ticketsInserted} ya existente(s)`,
  );
  // eslint-disable-next-line no-console
  console.log("[seed] credenciales dev:");
  // eslint-disable-next-line no-console
  console.log(`  admin -> ${users[0]!.email} / ${readEnvOr("SEED_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)}`);
  // eslint-disable-next-line no-console
  console.log(`  user  -> ${users[1]!.email} / ${readEnvOr("SEED_USER_PASSWORD", DEFAULT_USER_PASSWORD)}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[seed] error: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
