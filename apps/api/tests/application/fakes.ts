import type {
  Page,
  Ticket,
  TicketHistoryEntry,
  UserSummary,
} from "@soporte/shared";

import type {
  Clock,
  IdGenerator,
  NewHistoryEntry,
  Notifier,
  PasswordHasher,
  SessionClaims,
  SessionTokenSigner,
  TicketHistoryRepository,
  TicketRepository,
  TicketTransitionWriter,
  UserRecord,
  UserRepository,
} from "../../src/application/ports/index.js";
import type { UserDirectory } from "../../src/domain/ports.js";

/**
 * Fakes en memoria. Cada test compone los fakes que necesita y los
 * inyecta en el constructor del caso de uso (DI por constructor). Sin
 * mocks ni spies: son implementaciones reales con la minima superficie.
 *
 * `inMemoryUserRepo` expone dos vistas del mismo store: la vista
 * `UserRepository` (con passwordHash, usada por register/login) y un
 * adaptador `asDirectory()` que proyecta a `UserSummary` (usado por
 * casos de uso que solo necesitan el resumen).
 */

export const fixedClock = (iso: string): Clock => ({
  now: () => iso,
});

let idCounter = 0;
export const sequentialId = (prefix = "id"): IdGenerator => ({
  generate: () => {
    idCounter += 1;
    return `${prefix}-${idCounter.toString().padStart(4, "0")}`;
  },
});

export const resetIdCounter = (): void => {
  idCounter = 0;
};

export const constantId = (value: string): IdGenerator => ({
  generate: () => value,
});

export const fakePasswordHasher = (): PasswordHasher => ({
  hash: async (plain: string) => `hash:${plain}`,
  verify: async (plain: string, hash: string) => hash === `hash:${plain}`,
});

export const fakeSessionTokenSigner = (): SessionTokenSigner => ({
  sign: (claims) => `token.${claims.subject}.${claims.role}.${claims.expiresAt}`,
  verify: (token) => {
    const parts = token.split(".");
    if (parts.length !== 4 || parts[0] !== "token") {
      throw new Error("token invalido");
    }
    const role = parts[2]!;
    if (role !== "ADMIN" && role !== "USER") {
      throw new Error("token con rol invalido");
    }
    return {
      subject: parts[1]!,
      role,
      issuedAt: 0,
      expiresAt: Number.parseInt(parts[3]!, 10),
    } satisfies SessionClaims;
  },
});

export interface CapturedTicketCreated {
  readonly ticket: Ticket;
}

export interface CapturedStatusChange {
  readonly ticket: Ticket;
  readonly previousStatus: Ticket["status"];
  readonly observation: string | null;
  readonly actor: UserSummary;
}

export const fakeNotifier = (): Notifier & {
  readonly created: CapturedTicketCreated[];
  readonly statusChanges: CapturedStatusChange[];
} => {
  const created: CapturedTicketCreated[] = [];
  const statusChanges: CapturedStatusChange[] = [];
  return {
    created,
    statusChanges,
    notifyTicketCreated(ticket) {
      created.push({ ticket });
    },
    notifyStatusChanged(input) {
      statusChanges.push(input);
    },
  };
};

interface TicketStore {
  byId: Map<string, Ticket>;
  history: NewHistoryEntry[];
  users: Map<string, UserSummary>;
}

const seedUser = (store: TicketStore, user: UserSummary): void => {
  store.users.set(user.id, user);
};

const resolveUser = (
  store: TicketStore,
  id: string,
): UserSummary => {
  const u = store.users.get(id);
  if (u === undefined) {
    throw new Error(`usuario no encontrado: ${id}`);
  }
  return u;
};

export const inMemoryTicketRepo = (): TicketRepository &
  TicketTransitionWriter & {
    readonly store: TicketStore;
    seed(ticket: Ticket): void;
    seedUser(user: UserSummary): void;
  } => {
  const store: TicketStore = {
    byId: new Map(),
    history: [],
    users: new Map(),
  };
  return {
    store,
    seed(ticket) {
      store.byId.set(ticket.id, ticket);
      seedUser(store, ticket.requester);
      if (ticket.assignedTo !== null) {
        seedUser(store, ticket.assignedTo);
      }
    },
    seedUser(user) {
      seedUser(store, user);
    },
    async findById(id) {
      return store.byId.get(id) ?? null;
    },
    async list(query) {
      const all = [...store.byId.values()];
      const filtered = all.filter((t) => {
        if (!query.includeDeleted && t.deletedAt !== null) return false;
        if (query.status && t.status !== query.status) return false;
        if (query.priority && t.priority !== query.priority) return false;
        if (query.category && t.category !== query.category) return false;
        if (query.requesterId && t.requester.id !== query.requesterId)
          return false;
        if (query.search) {
          const needle = query.search.toLowerCase();
          const haystack = `${t.title} ${t.description}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      });
      const sortKey = query.sortBy ?? "createdAt";
      const sortDir = query.sortOrder ?? "desc";
      const dir = sortDir === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === bv) return 0;
        return av < bv ? -1 * dir : 1 * dir;
      });
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      return {
        items,
        page,
        pageSize,
        total: filtered.length,
        totalPages,
      };
    },
    async save(ticket) {
      store.byId.set(ticket.id, ticket);
      seedUser(store, ticket.requester);
      if (ticket.assignedTo !== null) {
        seedUser(store, ticket.assignedTo);
      }
      return ticket;
    },
    async update(id, changes, now) {
      const current = store.byId.get(id);
      if (current === undefined) throw new Error("ticket no encontrado");
      // Separar assignedToId del resto de campos porque vive en
      // UpdateTicketPatch pero el modelo de dominio expone `assignedTo`.
      const { assignedToId, ...rest } = changes;
      let assignedTo = current.assignedTo;
      if (assignedToId === null) {
        assignedTo = null;
      } else if (typeof assignedToId === "string") {
        assignedTo = resolveUser(store, assignedToId);
      }
      const updated: Ticket = {
        ...current,
        ...rest,
        assignedTo,
        updatedAt: now,
      };
      store.byId.set(id, updated);
      return updated;
    },
    async softDelete(id, now) {
      const current = store.byId.get(id);
      if (current === undefined) return;
      store.byId.set(id, { ...current, deletedAt: now });
    },
    async applyTransition({ ticketId, newStatus, resolvedAt, now, history }) {
      const current = store.byId.get(ticketId);
      if (current === undefined) throw new Error("ticket no encontrado");
      const updated: Ticket = {
        ...current,
        status: newStatus,
        resolvedAt: newStatus === "RESUELTA" ? resolvedAt : current.resolvedAt,
        updatedAt: now,
      };
      store.byId.set(ticketId, updated);
      store.history.push(history);
      return updated;
    },
  };
};

export const inMemoryHistoryRepo = (): TicketHistoryRepository & {
  readonly entries: TicketHistoryEntry[];
  seed(entry: TicketHistoryEntry): void;
} => {
  const entries: TicketHistoryEntry[] = [];
  return {
    entries,
    seed(entry) {
      entries.push(entry);
    },
    async listByTicket(ticketId, pagination) {
      const filtered = entries.filter((e) => e.ticketId === ticketId);
      const page = pagination.page;
      const pageSize = pagination.pageSize;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);
      return {
        items,
        page,
        pageSize,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      } satisfies Page<TicketHistoryEntry>;
    },
    async append(entry) {
      const id = `h-${entries.length + 1}`;
      const full: TicketHistoryEntry = {
        id,
        ticketId: entry.ticketId,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        changedBy: entry.changedBy,
        observation: entry.observation,
        createdAt: entry.createdAt,
      };
      entries.push(full);
      return full;
    },
  };
};

/**
 * Devuelve una vista `UserDirectory` (resumenes sin passwordHash) del
 * store interno. Pensado para inyectar en casos de uso que solo
 * necesitan el resumen (Create/Update/GetCurrent).
 */
const asUserDirectory = (users: readonly UserRecord[]): UserDirectory => ({
  async findById(id) {
    const u = users.find((x) => x.id === id);
    return u ? { id: u.id, name: u.name, email: u.email } : null;
  },
  async list() {
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  },
});

export const inMemoryUserRepo = (): UserRepository & {
  readonly users: UserRecord[];
  seed(user: UserRecord): void;
  asDirectory(): UserDirectory;
} => {
  const users: UserRecord[] = [];
  return {
    users,
    seed(user) {
      users.push(user);
    },
    asDirectory() {
      // Se devuelve una vista nueva cada vez para que refleje seeds
      // posteriores. El array es referencial; las closures capturan `users`.
      return asUserDirectory(users);
    },
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },
    async findByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },
    async create(input) {
      const user: UserRecord = {
        id: input.id,
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        createdAt: input.now,
      };
      users.push(user);
      return user;
    },
    async list() {
      return users.map(
        (u): UserSummary => ({ id: u.id, name: u.name, email: u.email }),
      );
    },
  };
};
