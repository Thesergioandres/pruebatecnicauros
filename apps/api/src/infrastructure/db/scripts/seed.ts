/**
 * seed.ts
 *
 * Inserta el usuario administrador inicial, leido de las variables
 * de entorno `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (con defaults
 * solo de desarrollo). Es idempotente: usa UUIDs fijos y
 * `ON CONFLICT (id) DO NOTHING`. Re-ejecutar el script no produce
 * duplicados.
 *
 * El spec exige que la creacion de usuarios sea exclusiva de `ADMIN`
 * (ver `POST /api/admin/users`); el seed es la excepcion documentada
 * que permite bootstrap del primer admin cuando la BD esta vacia.
 *
 * Uso:
 *   npm run db:seed --workspace @soporte/api
 */

import "../../env.js";
import bcrypt from "bcryptjs";

import { closePool, getPool } from "../pool.js";
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

const ADMIN_ID = "00000000-0000-5000-a000-000000000001";

const DEFAULT_ADMIN_EMAIL = "admin@soporte.local";
const DEFAULT_ADMIN_PASSWORD = "admin1234";

function readEnvOr(key: string, fallback: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return fallback;
  return value;
}

function buildAdmin(): {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRoleCode;
} {
  return {
    id: ADMIN_ID,
    name: "Ada Admin",
    email: readEnvOr("SEED_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL),
    password: readEnvOr("SEED_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD),
    role: "ADMIN",
  };
}

interface SeedHistory {
  readonly id: string;
  readonly ticketId: string;
  readonly previousStatus: TicketStatusCode | null;
  readonly newStatus: TicketStatusCode;
  readonly changedById: string;
  readonly observation: string | null;
  /** Dias hacia atras desde hoy (entero, puede ser negativo). */
  readonly daysAgo: number;
  /** Hora del dia (0-23) para el timestamp exacto, determinista. */
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
  readonly assignedToId: string | null;
  readonly history: readonly SeedHistory[];
}

/**
 * Tickets de demo. Como el seed solo crea el admin, todos los tickets
 * tienen al admin como solicitante. Algunos quedan asignados al
 * propio admin y otros sin asignar, para cubrir ambos casos del UI.
 */
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
      assignedToId: null,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000001",
          ticketId: "00000000-0000-5000-b000-000000000001",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: ADMIN_ID,
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
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000002",
          ticketId: "00000000-0000-5000-b000-000000000002",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: ADMIN_ID,
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
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000004",
          ticketId: "00000000-0000-5000-b000-000000000003",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: ADMIN_ID,
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
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000006",
          ticketId: "00000000-0000-5000-b000-000000000004",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: ADMIN_ID,
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
      assignedToId: null,
      history: [
        {
          id: "00000000-0000-5000-c000-000000000009",
          ticketId: "00000000-0000-5000-b000-000000000005",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: ADMIN_ID,
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
      assignedToId: ADMIN_ID,
      history: [
        {
          id: "00000000-0000-5000-c000-00000000000a",
          ticketId: "00000000-0000-5000-b000-000000000006",
          previousStatus: null,
          newStatus: "PENDIENTE",
          changedById: ADMIN_ID,
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

async function insertAdmin(): Promise<number> {
  const admin = buildAdmin();
  const passwordHash = await hashPassword(admin.password);
  const result = await getPool().query<UserRow>(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [admin.id, admin.name, admin.email, passwordHash, admin.role],
  );
  return result.rowCount ?? 0;
}

async function insertTicket(ticket: SeedTicket): Promise<boolean> {
  return new Promise((resolveFn, rejectFn) => {
    void (async () => {
      try {
        const ok = await insertTicketImpl(ticket);
        resolveFn(ok);
      } catch (err) {
        rejectFn(err as Error);
      }
    })();
  });
}

async function insertTicketImpl(ticket: SeedTicket): Promise<boolean> {
  const createdAt = offsetDate(
    ticket.history[0]?.daysAgo ?? 0,
    ticket.history[0]?.hour ?? 9,
  );
  const last = ticket.history.at(-1);
  const updatedAt =
    last === undefined ? createdAt : offsetDate(last.daysAgo, last.hour);
  const resolvedAt = ticket.status === "RESUELTA" ? updatedAt : null;
  const ticketResult = await getPool().query<TicketRow>(
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
      ADMIN_ID,
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
    await getPool().query<TicketHistoryRow>(
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
}

async function main(): Promise<void> {
  loadDatabaseConfig();
  const admin = buildAdmin();
  const adminInserted = await insertAdmin();
  console.log(
    `[seed] admin: ${adminInserted} nuevo(s), ${adminInserted === 0 ? 1 : 0} ya existente(s)`,
  );

  const tickets = buildTickets();
  let ticketsInserted = 0;
  for (const ticket of tickets) {
    const inserted = await insertTicket(ticket);
    if (inserted) ticketsInserted += 1;
  }
  console.log(
    `[seed] tickets: ${ticketsInserted} nuevo(s), ${tickets.length - ticketsInserted} ya existente(s)`,
  );
  console.log("[seed] credenciales dev del admin:");
  console.log(`  ${admin.email} / ${admin.password}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[seed] error: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
