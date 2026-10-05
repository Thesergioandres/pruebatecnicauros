import {
  ERROR_CODES,
  canTransition,
  isEditableStatus,
  requiresObservation,
  type CreateTicketInput,
  type Ticket,
  type TicketCategory,
  type TicketHistoryEntry,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketInput,
} from "@soporte/shared";

import { HttpError } from "../../infrastructure/http-client.js";
import type {
  ListTicketsQuery,
  ListTicketsResult,
} from "../../domain/tickets.js";
import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Implementacion en memoria del puerto de tickets.
 *
 * Replica el contrato DTO que entrega la API real (`Ticket`,
 * `TicketHistoryEntry`, `Page<T>`) y aplica la misma politica de
 * transiciones + regla de observacion en CRITICA -> RESUELTA
 * (`packages/shared/src/state-machine.ts`). Asi, cuando la API HTTP
 * sustituya a este adapter, la UI no se entera.
 *
 * Limitaciones conocidas (estan en el shell, no en la API):
 *  - Los datos viven en memoria del navegador; al recargar la pagina
 *    vuelven al seed. La API real persistira en PostgreSQL.
 *  - El solicitante en `create` lo toma de un pool fijo (la API real
 *    lo deriva de la sesion httpOnly).
 *  - El borrado logico (soft delete) lo dejamos fuera de este slice
 *    por alcance; cuando se habilite, sera exclusivo para `ADMIN`.
 */

// Orden estable para ordenar tickets por estado (de menor a mayor madurez).
const TICKET_STATUS_ORDER: Record<TicketStatus, number> = {
  PENDIENTE: 0,
  EN_PROGRESO: 1,
  RESUELTA: 2,
  CANCELADA: 3,
};

// Orden estable para ordenar tickets por prioridad.
const TICKET_PRIORITY_ORDER: Record<TicketPriority, number> = {
  BAJA: 0,
  MEDIA: 1,
  ALTA: 2,
  CRITICA: 3,
};

function priorityRank(prioridad: TicketPriority): number {
  return TICKET_PRIORITY_ORDER[prioridad] ?? 0;
}

function statusRank(estado: TicketStatus): number {
  return TICKET_STATUS_ORDER[estado] ?? 0;
}

// Comparador central: aplica el orden pedido y, en caso de empate, cae a
// `createdAt` ascendente para que la paginacion sea estable entre llamadas.
function compareTickets(
  a: Ticket,
  b: Ticket,
  campo: ListTicketsQuery["sort"]["field"],
  orden: ListTicketsQuery["sort"]["order"],
): number {
  let resultado = 0;
  switch (campo) {
    case "title":
      resultado = a.title.localeCompare(b.title, "es");
      break;
    case "priority":
      resultado = priorityRank(a.priority) - priorityRank(b.priority);
      break;
    case "status":
      resultado = statusRank(a.status) - statusRank(b.status);
      break;
    case "updatedAt":
      resultado = a.updatedAt.localeCompare(b.updatedAt);
      break;
    case "createdAt":
    default:
      resultado = a.createdAt.localeCompare(b.createdAt);
      break;
  }
  if (resultado === 0) {
    resultado = a.createdAt.localeCompare(b.createdAt);
  }
  return orden === "asc" ? resultado : -resultado;
}

// Helper para cortar el flujo con un error HTTP tipado (mismo formato que
// la API real: `{ error: { code, message, details? } }`).
function failWith(
  code: keyof typeof ERROR_CODES,
  message: string,
  status: number,
  details?: { path: string; message: string }[],
): never {
  throw new HttpError(status, ERROR_CODES[code], message, details);
}

// Latencia simulada para que la UI exhiba estados de carga de forma
// realista. La API real no la tendra.
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

// ------- Seed (usuarios + tickets) -----------------------------------------

interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

const SEED_USERS: SeedUser[] = [
  { id: "u-demo", name: "Persona Demo", email: "demo@soporte.local", role: "USER" },
  { id: "u-admin", name: "Admin Demo", email: "admin@soporte.local", role: "ADMIN" },
  { id: "u-ana", name: "Ana Ríos", email: "ana@soporte.local", role: "USER" },
  { id: "u-luis", name: "Luis Pardo", email: "luis@soporte.local", role: "USER" },
  { id: "u-maria", name: "María Vélez", email: "maria@soporte.local", role: "USER" },
];

function userSummary(usuario: SeedUser) {
  return { id: usuario.id, name: usuario.name, email: usuario.email };
}

function nowMinusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function nowMinusMinutes(min: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - min);
  return d.toISOString();
}

interface SeedHistoryStep {
  previousStatus: TicketStatus | null;
  newStatus: TicketStatus;
  changedById: string;
  observation: string | null;
  minutesAgo: number;
}

interface SeedTicket {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  assignedToId: string | null;
  createdDaysAgo: number;
  resolved: boolean;
  history: SeedHistoryStep[];
}

const SEED_TICKETS: SeedTicket[] = [
  {
    title: "Monitor parpadea en el segundo piso",
    description: "Desde esta mañana el monitor de la estación 12 pierde señal por segundos. Ya probé cambiar el cable HDMI.",
    category: "HARDWARE",
    priority: "ALTA",
    status: "EN_PROGRESO",
    requesterId: "u-ana",
    assignedToId: "u-luis",
    createdDaysAgo: 2,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-ana", observation: null, minutesAgo: 60 * 24 * 2 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-luis", observation: "Voy a revisar el cableado.", minutesAgo: 60 * 24 * 1 },
    ],
  },
  {
    title: "No puedo entrar al VPN corporativo",
    description: "El cliente VPN pide usuario y contraseña pero al ingresar me dice 'credenciales inválidas' aunque las reseté ayer.",
    category: "RED",
    priority: "CRITICA",
    status: "PENDIENTE",
    requesterId: "u-maria",
    assignedToId: null,
    createdDaysAgo: 0,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-maria", observation: null, minutesAgo: 35 },
    ],
  },
  {
    title: "Solicitud de acceso a la carpeta de diseño",
    description: "Necesito acceso de lectura a la carpeta compartida \\\\srv\\diseno para revisar entregables del proyecto X.",
    category: "ACCESOS",
    priority: "BAJA",
    status: "RESUELTA",
    requesterId: "u-ana",
    assignedToId: "u-admin",
    createdDaysAgo: 6,
    resolved: true,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-ana", observation: null, minutesAgo: 60 * 24 * 6 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-admin", observation: "Aprobado por gerencia.", minutesAgo: 60 * 24 * 5 },
      { previousStatus: "EN_PROGRESO", newStatus: "RESUELTA", changedById: "u-admin", observation: "Permiso aplicado en Active Directory.", minutesAgo: 60 * 24 * 4 },
    ],
  },
  {
    title: "Aplicación de inventario se cierra al imprimir",
    description: "Al generar el PDF de inventario y abrir la vista previa, la app se cierra sin mensaje de error. Probé en dos equipos.",
    category: "SOFTWARE",
    priority: "ALTA",
    status: "PENDIENTE",
    requesterId: "u-luis",
    assignedToId: null,
    createdDaysAgo: 1,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-luis", observation: null, minutesAgo: 60 * 24 * 1 },
    ],
  },
  {
    title: "Teclado del puesto de recepción responde con retraso",
    description: "Las teclas se registran con unos 2 segundos de demora. Reiniciar no lo solucionó.",
    category: "HARDWARE",
    priority: "MEDIA",
    status: "EN_PROGRESO",
    requesterId: "u-demo",
    assignedToId: "u-luis",
    createdDaysAgo: 3,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-demo", observation: null, minutesAgo: 60 * 24 * 3 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-luis", observation: "Posible cambio de teclado en sitio.", minutesAgo: 60 * 24 * 2 },
    ],
  },
  {
    title: "Wi-Fi se desconecta en la sala de juntas",
    description: "Cada 10-15 minutos la conexión cae. Más frecuente cuando hay más de 6 personas conectadas.",
    category: "RED",
    priority: "MEDIA",
    status: "PENDIENTE",
    requesterId: "u-maria",
    assignedToId: null,
    createdDaysAgo: 4,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-maria", observation: null, minutesAgo: 60 * 24 * 4 },
    ],
  },
  {
    title: "Outlook no sincroniza desde ayer",
    description: "El cliente Outlook muestra 'Desconectado' y no recibe correos nuevos. Exchange en web sí funciona.",
    category: "SOFTWARE",
    priority: "ALTA",
    status: "EN_PROGRESO",
    requesterId: "u-ana",
    assignedToId: "u-luis",
    createdDaysAgo: 1,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-ana", observation: null, minutesAgo: 60 * 24 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-luis", observation: "Reviso perfil de Outlook.", minutesAgo: 60 * 12 },
    ],
  },
  {
    title: "Reinstalación de equipo del área contable",
    description: "Solicito formateo y reinstalación del equipo de la analista contable. Backup ya coordinado.",
    category: "OTROS",
    priority: "BAJA",
    status: "CANCELADA",
    requesterId: "u-demo",
    assignedToId: "u-admin",
    createdDaysAgo: 7,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-demo", observation: null, minutesAgo: 60 * 24 * 7 },
      { previousStatus: "PENDIENTE", newStatus: "CANCELADA", changedById: "u-admin", observation: "La analista se reasignó de equipo.", minutesAgo: 60 * 24 * 6 },
    ],
  },
  {
    title: "Ruido extraño en el disco del servidor de backups",
    description: "El servidor emite un click periódico cada 4-5 segundos. Revisé el log de RAID y no aparece nada.",
    category: "HARDWARE",
    priority: "CRITICA",
    status: "EN_PROGRESO",
    requesterId: "u-luis",
    assignedToId: "u-admin",
    createdDaysAgo: 0,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-luis", observation: null, minutesAgo: 180 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-admin", observation: "Programo revisión presencial.", minutesAgo: 90 },
    ],
  },
  {
    title: "Alta de usuario en el ERP",
    description: "Necesito crear el usuario 'cgarcia' con rol 'USER' en el ERP. El empleado ingresa el lunes.",
    category: "ACCESOS",
    priority: "MEDIA",
    status: "RESUELTA",
    requesterId: "u-maria",
    assignedToId: "u-admin",
    createdDaysAgo: 5,
    resolved: true,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-maria", observation: null, minutesAgo: 60 * 24 * 5 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-admin", observation: "Aprobado por gerencia.", minutesAgo: 60 * 24 * 4 },
      { previousStatus: "EN_PROGRESO", newStatus: "RESUELTA", changedById: "u-admin", observation: "Usuario creado y primer acceso OK.", minutesAgo: 60 * 24 * 3 },
    ],
  },
  {
    title: "Proyector de la sala 3 no enciende",
    description: "El proyector de la sala 3 no responde. El botón de encendido queda en ámbar y no pasa a verde.",
    category: "HARDWARE",
    priority: "MEDIA",
    status: "PENDIENTE",
    requesterId: "u-ana",
    assignedToId: null,
    createdDaysAgo: 0,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-ana", observation: null, minutesAgo: 90 },
    ],
  },
  {
    title: "Impresora de contabilidad deja hojas atascadas",
    description: "Tras imprimir 3 páginas seguidas, la impresora marca atasco en la bandeja 2 aunque está vacía.",
    category: "HARDWARE",
    priority: "BAJA",
    status: "EN_PROGRESO",
    requesterId: "u-demo",
    assignedToId: "u-luis",
    createdDaysAgo: 4,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-demo", observation: null, minutesAgo: 60 * 24 * 4 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-luis", observation: "Voy a limpiar el rodillo.", minutesAgo: 60 * 24 * 2 },
    ],
  },
  {
    title: "Error 500 al generar reporte mensual",
    description: "Al pedir el reporte mensual de ventas, el ERP muestra '500 Internal Server Error' de forma intermitente.",
    category: "SOFTWARE",
    priority: "ALTA",
    status: "PENDIENTE",
    requesterId: "u-maria",
    assignedToId: null,
    createdDaysAgo: 1,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-maria", observation: null, minutesAgo: 60 * 20 },
    ],
  },
  {
    title: "Cambio de silla ergonómica",
    description: "La silla actual tiene el respaldo roto. Solicito reemplazo por una ergonómica talla M.",
    category: "OTROS",
    priority: "BAJA",
    status: "RESUELTA",
    requesterId: "u-luis",
    assignedToId: "u-admin",
    createdDaysAgo: 10,
    resolved: true,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-luis", observation: null, minutesAgo: 60 * 24 * 10 },
      { previousStatus: "PENDIENTE", newStatus: "EN_PROGRESO", changedById: "u-admin", observation: "Silla pedida al proveedor.", minutesAgo: 60 * 24 * 8 },
      { previousStatus: "EN_PROGRESO", newStatus: "RESUELTA", changedById: "u-admin", observation: "Silla instalada y validada.", minutesAgo: 60 * 24 * 5 },
    ],
  },
  {
    title: "Acceso a la base de datos de pruebas",
    description: "Para el ambiente de QA necesito acceso de lectura a la base de datos de pruebas del equipo de pagos.",
    category: "ACCESOS",
    priority: "MEDIA",
    status: "PENDIENTE",
    requesterId: "u-ana",
    assignedToId: null,
    createdDaysAgo: 2,
    resolved: false,
    history: [
      { previousStatus: null, newStatus: "PENDIENTE", changedById: "u-ana", observation: null, minutesAgo: 60 * 24 * 2 },
    ],
  },
];

interface Tienda {
  tickets: Map<string, Ticket>;
  history: Map<string, TicketHistoryEntry[]>; // ticketId -> entradas (asc)
  users: Map<string, SeedUser>;
}

// Construye el store en memoria una sola vez al cargar el modulo.
function buildStore(): Tienda {
  const tienda: Tienda = {
    tickets: new Map(),
    history: new Map(),
    users: new Map(SEED_USERS.map((u) => [u.id, u])),
  };

  for (const seed of SEED_TICKETS) {
    const solicitante = tienda.users.get(seed.requesterId);
    if (!solicitante) continue;
    const responsable = seed.assignedToId ? tienda.users.get(seed.assignedToId) ?? null : null;
    const id = newId();
    const creadoEn = nowMinusDays(seed.createdDaysAgo);
    const resueltoEn = seed.resolved
      ? new Date(new Date(creadoEn).getTime() + 1000 * 60 * 60 * 24).toISOString()
      : null;
    const ultimoMinutos = seed.history[seed.history.length - 1]?.minutesAgo ?? 0;
    const actualizadoEn = nowMinusMinutes(ultimoMinutos);

    const ticket: Ticket = {
      id,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      priority: seed.priority,
      status: seed.status,
      requester: userSummary(solicitante),
      assignedTo: responsable ? userSummary(responsable) : null,
      createdAt: creadoEn,
      updatedAt: actualizadoEn,
      resolvedAt: resueltoEn,
      deletedAt: null,
    };
    tienda.tickets.set(id, ticket);

    const entradas: TicketHistoryEntry[] = seed.history.map((h) => {
      const cambiadoPor = tienda.users.get(h.changedById);
      if (!cambiadoPor) {
        throw new Error(`Seed invalido: usuario ${h.changedById} no existe`);
      }
      return {
        id: newId(),
        ticketId: id,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        changedBy: userSummary(cambiadoPor),
        observation: h.observation,
        createdAt: nowMinusMinutes(h.minutesAgo),
      };
    });
    tienda.history.set(id, entradas);
  }

  return tienda;
}

const tienda: Tienda = buildStore();

function snapshot(): Ticket[] {
  return Array.from(tienda.tickets.values());
}

function appendHistory(
  ticketId: string,
  entrada: Omit<TicketHistoryEntry, "id" | "ticketId" | "createdAt">,
): TicketHistoryEntry {
  const created: TicketHistoryEntry = {
    id: newId(),
    ticketId,
    createdAt: new Date().toISOString(),
    ...entrada,
  };
  const lista = tienda.history.get(ticketId) ?? [];
  lista.push(created);
  tienda.history.set(ticketId, lista);
  return created;
}

function getUserOrFail(id: string): SeedUser {
  const usuario = tienda.users.get(id);
  if (!usuario) {
    failWith("NOT_FOUND", `Usuario ${id} no existe.`, 404);
  }
  return usuario;
}

function getTicketOrFail(id: string): Ticket {
  const ticket = tienda.tickets.get(id);
  if (!ticket || ticket.deletedAt) {
    failWith("NOT_FOUND", `Solicitud ${id} no encontrada.`, 404);
  }
  return ticket;
}

// Aplica la regla "CRITICA -> RESUELTA exige observacion no vacia"
// que vive en `packages/shared/src/state-machine.ts`.
function validateObservationRequirement(
  desde: TicketStatus,
  hasta: TicketStatus,
  prioridad: TicketPriority,
  observacion: string | undefined,
): void {
  if (requiresObservation(desde, hasta, prioridad)) {
    if (!observacion || observacion.trim().length === 0) {
      failWith(
        "OBSERVATION_REQUIRED",
        "Resolver una solicitud crítica exige una observación.",
        422,
        [{ path: "observation", message: "La observación es obligatoria al resolver una solicitud crítica." }],
      );
    }
  }
}

export class InMemoryTicketRepository implements TicketRepository {
  async list(query: ListTicketsQuery): Promise<ListTicketsResult> {
    await delay(180);
    const { filter, sort, pagination } = query;
    const busqueda = filter.search?.trim().toLowerCase();

    let filas = snapshot();
    if (!filter.includeDeleted) {
      filas = filas.filter((t) => t.deletedAt === null);
    }
    if (filter.status) {
      filas = filas.filter((t) => t.status === filter.status);
    }
    if (filter.priority) {
      filas = filas.filter((t) => t.priority === filter.priority);
    }
    if (filter.category) {
      filas = filas.filter((t) => t.category === filter.category);
    }
    if (filter.requesterId) {
      filas = filas.filter((t) => t.requester.id === filter.requesterId);
    }
    if (busqueda) {
      filas = filas.filter(
        (t) =>
          t.title.toLowerCase().includes(busqueda) ||
          t.description.toLowerCase().includes(busqueda),
      );
    }

    filas.sort((a, b) => compareTickets(a, b, sort.field, sort.order));

    const total = filas.length;
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const safePage = Math.min(Math.max(1, pagination.page), totalPages);
    const inicio = (safePage - 1) * pagination.pageSize;
    const items = filas.slice(inicio, inicio + pagination.pageSize);

    return {
      items,
      page: safePage,
      pageSize: pagination.pageSize,
      total,
      totalPages,
    };
  }

  async getById(id: string): Promise<Ticket | null> {
    await delay(120);
    const ticket = tienda.tickets.get(id);
    if (!ticket || ticket.deletedAt) return null;
    return ticket;
  }

  async create(
    input: CreateTicketInput,
    requester: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    await delay(220);
    const responsable = input.assignedToId
      ? userSummary(getUserOrFail(input.assignedToId))
      : null;
    const id = newId();
    const ahora = new Date().toISOString();
    const ticket: Ticket = {
      id,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      priority: input.priority,
      status: "PENDIENTE",
      requester: { id: requester.id, name: requester.name, email: requester.email },
      assignedTo: responsable,
      createdAt: ahora,
      updatedAt: ahora,
      resolvedAt: null,
      deletedAt: null,
    };
    tienda.tickets.set(id, ticket);
    tienda.history.set(id, []);
    appendHistory(id, {
      previousStatus: null,
      newStatus: "PENDIENTE",
      changedBy: { id: requester.id, name: requester.name, email: requester.email },
      observation: null,
    });
    return ticket;
  }

  async update(id: string, input: UpdateTicketInput): Promise<Ticket> {
    await delay(200);
    const actual = getTicketOrFail(id);
    if (!isEditableStatus(actual.status)) {
      failWith(
        "TICKET_LOCKED",
        `No se puede editar una solicitud en estado ${actual.status}.`,
        409,
        [{ path: "status", message: `Estado ${actual.status} es terminal.` }],
      );
    }
    const responsable = input.assignedToId === undefined
      ? actual.assignedTo
      : input.assignedToId === null
        ? null
        : userSummary(getUserOrFail(input.assignedToId));

    const next: Ticket = {
      ...actual,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      assignedTo: responsable,
      updatedAt: new Date().toISOString(),
    };
    tienda.tickets.set(id, next);
    return next;
  }

  async changeStatus(
    id: string,
    nextStatus: TicketStatus,
    observation: string | undefined,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    await delay(200);
    const actual = getTicketOrFail(id);
    if (actual.status === nextStatus) {
      failWith(
        "INVALID_TRANSITION",
        `La solicitud ya se encuentra en estado ${actual.status}.`,
        409,
        [{ path: "status", message: `Ya esta en ${actual.status}.` }],
      );
    }
    if (!canTransition(actual.status, nextStatus)) {
      failWith(
        "INVALID_TRANSITION",
        `Transición ${actual.status} -> ${nextStatus} no permitida.`,
        409,
        [{ path: "status", message: `Transición ${actual.status} -> ${nextStatus} no permitida.` }],
      );
    }
    validateObservationRequirement(actual.status, nextStatus, actual.priority, observation);

    const actualizadoEn = new Date().toISOString();
    const resueltoEn = nextStatus === "RESUELTA" ? actualizadoEn : actual.resolvedAt;
    const next: Ticket = {
      ...actual,
      status: nextStatus,
      updatedAt: actualizadoEn,
      resolvedAt: resueltoEn,
    };
    tienda.tickets.set(id, next);
    appendHistory(id, {
      previousStatus: actual.status,
      newStatus: nextStatus,
      changedBy: { id: actor.id, name: actor.name, email: actor.email },
      observation: observation?.trim() || null,
    });
    return next;
  }

  async cancel(
    id: string,
    observation: string | undefined,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    return this.changeStatus(id, "CANCELADA", observation, actor);
  }

  async softDelete(
    id: string,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    await delay(180);
    const actual = getTicketOrFail(id);
    const ahora = new Date().toISOString();
    const next: Ticket = {
      ...actual,
      deletedAt: ahora,
      updatedAt: ahora,
    };
    tienda.tickets.set(id, next);
    appendHistory(id, {
      previousStatus: actual.status,
      newStatus: actual.status,
      changedBy: { id: actor.id, name: actor.name, email: actor.email },
      observation: "Solicitud eliminada (soft delete).",
    });
    return next;
  }

  async history(
    id: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: TicketHistoryEntry[]; total: number }> {
    await delay(140);
    getTicketOrFail(id);
    const all = tienda.history.get(id) ?? [];
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const safePage = Math.min(Math.max(1, pagination.page), totalPages);
    const inicio = (safePage - 1) * pagination.pageSize;
    const itemsDesc = [...all].reverse();
    const items = itemsDesc.slice(inicio, inicio + pagination.pageSize);
    return { items, total };
  }

  async listUsers(): Promise<{ id: string; name: string; email: string }[]> {
    await delay(80);
    return Array.from(tienda.users.values()).map((u) => userSummary(u));
  }
}
