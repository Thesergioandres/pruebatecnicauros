import { beforeEach, describe, expect, it, vi } from "vitest";

import { PgTicketRepository } from "../../src/infrastructure/db/repositories/pg-ticket-repository.js";
import { PgTicketHistoryRepository } from "../../src/infrastructure/db/repositories/pg-ticket-history-repository.js";
import type { DbClient, DbPool } from "../../src/infrastructure/db/pool.js";

/**
 * Test de regresion del bug "PATCH /status -> 500 INTERNAL_ERROR".
 *
 * Causa: `ticket_history.id` es `TEXT PRIMARY KEY` sin DEFAULT; el
 * INSERT original de `applyTransition` (y de `append`) omitia la
 * columna `id`, asi que Postgres lanzaba
 *   null value in column "id" of relation "ticket_history" violates not-null constraint
 * que el handler mapeaba a 500.
 *
 * El test reproduce la constraint NOT NULL en un mock de cliente y
 * verifica que las queries de INSERT incluyen la generacion de id.
 * Sin el fix, la llamada al metodo lanza y el test falla en rojo;
 * con el fix, la query lleva `id` + `gen_random_uuid()::text` y la
 * simulacion acepta el INSERT.
 */

// Mockeamos el modulo `pool` para que `withTransaction` use el
// `connect` de nuestro mock, no el singleton `getPool` real (que
// intentaria conectar a Postgres y fallaria en este entorno).
const mockState = vi.hoisted(() => ({
  pool: undefined as DbPool | undefined,
  queries: [] as Array<{ sql: string; params: readonly unknown[] }>,
}));

import type * as PoolModuleType from "../../src/infrastructure/db/pool.js";
vi.mock("../../src/infrastructure/db/pool.js", async (importOriginal) => {
  const original = await importOriginal<typeof PoolModuleType>();
  return {
    ...original,
    withTransaction: async <T>(fn: (client: DbClient) => Promise<T>): Promise<T> => {
      if (mockState.pool === undefined) {
        throw new Error("mockState.pool no inicializado en el test");
      }
      const client = await mockState.pool.connect();
      try {
        const result = await fn(client);
        return result;
      } finally {
        client.release();
      }
    },
  };
});

interface MockOptions {
  readonly ticketHistoryIdInSql: boolean;
}

const makePoolMock = (opts: MockOptions): DbPool => {
  const clientQuery = async (
    sql: string,
    params: readonly unknown[],
  ): Promise<{ rows: unknown[]; rowCount: number }> => {
    mockState.queries.push({ sql, params });
    if (sql.includes("INSERT INTO ticket_history")) {
      if (!opts.ticketHistoryIdInSql) {
        // Reproduce la constraint NOT NULL del esquema real.
        throw new Error(
          'null value in column "id" of relation "ticket_history" violates not-null constraint',
        );
      }
      // `append` usa `WITH inserted AS (... RETURNING ...) SELECT ... JOIN users`
      // y espera la fila con los campos del join. `applyTransition` hace
      // el INSERT pelado y relee el ticket aparte. Las distinguimos por
      // la presencia de `RETURNING` + `JOIN users` en la misma query.
      if (sql.includes("RETURNING") && sql.includes("JOIN users")) {
        return {
          rows: [
            {
              id: "h-1",
              ticket_id: "t-1",
              previous_status: "PENDIENTE",
              new_status: "EN_PROGRESO",
              changed_by_id: "u-1",
              observation: null,
              created_at: new Date("2026-01-01T00:00:00.000Z"),
              changed_by_name: "Ana",
              changed_by_email: "ana@example.com",
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("UPDATE tickets")) {
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("FROM tickets t")) {
      return {
        rows: [
          {
            id: "t-1",
            title: "x",
            description: "x",
            category: "HARDWARE",
            priority: "MEDIA",
            status: "EN_PROGRESO",
            requester_id: "u-1",
            assigned_to_id: null,
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            updated_at: new Date("2026-01-01T00:00:00.000Z"),
            resolved_at: null,
            deleted_at: null,
            requester_name: "Ana",
            requester_email: "ana@example.com",
            assigned_user_id: null,
            assigned_name: null,
            assigned_email: null,
          },
        ],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  };

  const client = {
    query: clientQuery,
    release: vi.fn(),
  } as unknown as DbClient;

  const pool = {
    query: clientQuery,
    connect: async () => client,
  } as unknown as DbPool;

  return pool;
};

beforeEach(() => {
  mockState.queries = [];
});

describe("PgTicketRepository.applyTransition (regresion bug 500)", () => {
  it("lanza error de constraint si la query INSERT omite la columna id", async () => {
    // Modo "antes del fix": el mock simula la BD y la query no lleva id.
    mockState.pool = makePoolMock({ ticketHistoryIdInSql: false });
    const repo = new PgTicketRepository(mockState.pool);

    await expect(
      repo.applyTransition({
        ticketId: "t-1",
        newStatus: "EN_PROGRESO",
        resolvedAt: null,
        now: "2026-01-01T00:00:00.000Z",
        history: {
          ticketId: "t-1",
          previousStatus: "PENDIENTE",
          newStatus: "EN_PROGRESO",
          changedBy: { id: "u-1", name: "Ana", email: "ana@example.com" },
          observation: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      }),
    ).rejects.toThrow(/null value in column "id"/);

    const sawHistoryInsert = mockState.queries.some((q) =>
      q.sql.includes("INSERT INTO ticket_history"),
    );
    expect(sawHistoryInsert).toBe(true);
  });

  it("completa la transicion cuando la query INSERT incluye id (post-fix)", async () => {
    mockState.pool = makePoolMock({ ticketHistoryIdInSql: true });
    const repo = new PgTicketRepository(mockState.pool);

    const updated = await repo.applyTransition({
      ticketId: "t-1",
      newStatus: "EN_PROGRESO",
      resolvedAt: null,
      now: "2026-01-01T00:00:00.000Z",
      history: {
        ticketId: "t-1",
        previousStatus: "PENDIENTE",
        newStatus: "EN_PROGRESO",
        changedBy: { id: "u-1", name: "Ana", email: "ana@example.com" },
        observation: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(updated.id).toBe("t-1");
    expect(updated.status).toBe("EN_PROGRESO");

    const historyInsert = mockState.queries.find((q) =>
      q.sql.includes("INSERT INTO ticket_history"),
    );
    expect(historyInsert, "se ejecuto el INSERT de historial").toBeDefined();
    expect(historyInsert!.sql).toMatch(/INSERT INTO ticket_history[\s\S]*id/);
    expect(historyInsert!.sql).toMatch(/gen_random_uuid\(\)/);
  });
});

describe("PgTicketHistoryRepository.append (mismo bug latente)", () => {
  it("incluye id y gen_random_uuid en el INSERT", async () => {
    mockState.pool = makePoolMock({ ticketHistoryIdInSql: true });
    const repo = new PgTicketHistoryRepository(mockState.pool);

    await repo.append({
      ticketId: "t-1",
      previousStatus: "PENDIENTE",
      newStatus: "EN_PROGRESO",
      changedBy: { id: "u-1", name: "Ana", email: "ana@example.com" },
      observation: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const insert = mockState.queries.find((q) =>
      q.sql.includes("INSERT INTO ticket_history"),
    );
    expect(insert, "se ejecuto el INSERT").toBeDefined();
    expect(insert!.sql).toMatch(/INSERT INTO ticket_history[\s\S]*id/);
    expect(insert!.sql).toMatch(/gen_random_uuid\(\)/);
  });

  it("falla con error de constraint si el INSERT omite id", async () => {
    mockState.pool = makePoolMock({ ticketHistoryIdInSql: false });
    const repo = new PgTicketHistoryRepository(mockState.pool);
    await expect(
      repo.append({
        ticketId: "t-1",
        previousStatus: "PENDIENTE",
        newStatus: "EN_PROGRESO",
        changedBy: { id: "u-1", name: "Ana", email: "ana@example.com" },
        observation: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(/null value in column "id"/);
  });
});
