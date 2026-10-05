import type {
  Page,
  Ticket,
  TicketPriority,
} from "@soporte/shared";

import {
  type DbClient,
  type DbPool,
  withTransaction,
} from "../pool.js";
import type {
  NewHistoryEntry,
  TicketRepository,
  TicketTransitionWriter,
  UpdateTicketPatch,
} from "../../../application/ports/index.js";
import type { ListTicketsQuery } from "../../../domain/ports.js";
import type { TicketRow } from "../types.js";

import {
  mapTicketRow,
  type TicketRowWithJoins,
} from "./row-mappers.js";

/**
 * Peso de prioridad: se persiste en la columna `tickets.priority_weight`
 * y permite ordenar por prioridad sin tocar el orden alfabetico del
 * codigo. Coincide con el CHECK de la migracion 001.
 */
const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  BAJA: 0,
  MEDIA: 1,
  ALTA: 2,
  CRITICA: 3,
};

const TICKET_SELECT = `
  SELECT
    t.id, t.title, t.description, t.category, t.priority,
    t.priority_weight, t.status,
    t.requester_id, t.assigned_to_id,
    t.created_at, t.updated_at, t.resolved_at, t.deleted_at,
    r.name AS requester_name,
    r.email AS requester_email,
    a.id AS assigned_user_id,
    a.name AS assigned_name,
    a.email AS assigned_email
  FROM tickets t
  JOIN users r ON r.id = t.requester_id
  LEFT JOIN users a ON a.id = t.assigned_to_id
`;

interface CountRow {
  count: string;
}

const mapCount = (row: CountRow): number => Number.parseInt(row.count, 10);

const SORT_COLUMN: Record<NonNullable<ListTicketsQuery["sortBy"]>, string> = {
  createdAt: "t.created_at",
  updatedAt: "t.updated_at",
  title: "t.title",
  priority: "t.priority_weight",
  status: "t.status",
};

export class PgTicketRepository implements TicketRepository, TicketTransitionWriter {
  constructor(private readonly pool: DbPool) {}

  async findById(id: string): Promise<Ticket | null> {
    const result = await this.pool.query<TicketRowWithJoins>(
      `${TICKET_SELECT} WHERE t.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapTicketRow(row);
  }

  async list(query: ListTicketsQuery): Promise<Page<Ticket>> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.includeDeleted !== true) {
      where.push("t.deleted_at IS NULL");
    }
    if (query.status !== undefined) {
      params.push(query.status);
      where.push(`t.status = $${params.length}`);
    }
    if (query.priority !== undefined) {
      params.push(query.priority);
      where.push(`t.priority = $${params.length}`);
    }
    if (query.category !== undefined) {
      params.push(query.category);
      where.push(`t.category = $${params.length}`);
    }
    if (query.requesterId !== undefined) {
      params.push(query.requesterId);
      where.push(`t.requester_id = $${params.length}`);
    }
    if (query.search !== undefined && query.search.trim() !== "") {
      const needle = `%${query.search.trim().toLowerCase()}%`;
      params.push(needle);
      const idx = params.length;
      where.push(
        `(lower(t.title) LIKE $${idx} OR lower(t.description) LIKE $${idx})`,
      );
    }
    if ((query as { assignedToId?: string }).assignedToId !== undefined) {
      const assignedId = (query as { assignedToId?: string }).assignedToId;
      if (typeof assignedId === "string") {
        params.push(assignedId);
        where.push(`t.assigned_to_id = $${params.length}`);
      }
    }

    const whereClause = where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`;

    const totalResult = await this.pool.query<CountRow>(
      `SELECT COUNT(*)::text AS count FROM tickets t ${whereClause}`,
      params,
    );
    const total = mapCount(totalResult.rows[0]!);

    const sortColumn = SORT_COLUMN[query.sortBy ?? "createdAt"];
    const sortDir = query.sortOrder === "asc" ? "ASC" : "DESC";
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const offset = (page - 1) * pageSize;

    params.push(pageSize);
    params.push(offset);
    const limitParam = `$${params.length - 1}`;
    const offsetParam = `$${params.length}`;

    const itemsResult = await this.pool.query<TicketRowWithJoins>(
      `${TICKET_SELECT}
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDir} NULLS LAST, t.id ${sortDir}
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );

    return {
      items: itemsResult.rows.map(mapTicketRow),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async save(ticket: Ticket): Promise<Ticket> {
    await this.pool.query(
      `INSERT INTO tickets (
         id, title, description, category, priority, priority_weight,
         status, requester_id, assigned_to_id,
         created_at, updated_at, resolved_at, deleted_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ticket.id,
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.priority,
        PRIORITY_WEIGHT[ticket.priority],
        ticket.status,
        ticket.requester.id,
        ticket.assignedTo?.id ?? null,
        ticket.createdAt,
        ticket.updatedAt,
        ticket.resolvedAt,
        ticket.deletedAt,
      ],
    );
    const fresh = await this.findById(ticket.id);
    if (fresh === null) {
      throw new Error(`El ticket ${ticket.id} no aparecio tras el INSERT`);
    }
    return fresh;
  }

  async update(
    id: string,
    changes: UpdateTicketPatch,
    _now: string,
  ): Promise<Ticket> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (changes.title !== undefined) {
      params.push(changes.title);
      sets.push(`title = $${params.length}`);
    }
    if (changes.description !== undefined) {
      params.push(changes.description);
      sets.push(`description = $${params.length}`);
    }
    if (changes.category !== undefined) {
      params.push(changes.category);
      sets.push(`category = $${params.length}`);
    }
    if (changes.priority !== undefined) {
      params.push(changes.priority);
      sets.push(`priority = $${params.length}`);
      sets.push(`priority_weight = $${params.length + 1}`);
      params.push(PRIORITY_WEIGHT[changes.priority]);
    }
    if (changes.assignedToId === null) {
      sets.push("assigned_to_id = NULL");
    } else if (typeof changes.assignedToId === "string") {
      params.push(changes.assignedToId);
      sets.push(`assigned_to_id = $${params.length}`);
    }

    if (sets.length === 0) {
      const current = await this.findById(id);
      if (current === null) throw new Error(`Ticket ${id} no encontrado`);
      return current;
    }

    params.push(id);
    await this.pool.query(
      `UPDATE tickets SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params,
    );
    const fresh = await this.findById(id);
    if (fresh === null) throw new Error(`Ticket ${id} no encontrado tras UPDATE`);
    return fresh;
  }

  async softDelete(id: string, _now: string): Promise<void> {
    await this.pool.query(
      `UPDATE tickets SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }

  async applyTransition(input: {
    ticketId: string;
    newStatus: Ticket["status"];
    resolvedAt: string | null;
    now: string;
    history: NewHistoryEntry;
  }): Promise<Ticket> {
    return withTransaction(async (client: DbClient) => {
      await client.query<TicketRow>(
        `UPDATE tickets
         SET status = $1, resolved_at = $2
         WHERE id = $3`,
        [input.newStatus, input.resolvedAt, input.ticketId],
      );
      // El id de la entrada de historial lo genera la BD; el puerto
      // NewHistoryEntry no lo expone porque la aplicacion no lo necesita.
      await client.query(
        `INSERT INTO ticket_history (
           id, ticket_id, previous_status, new_status,
           changed_by_id, observation, created_at
         ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)`,
        [
          input.history.ticketId,
          input.history.previousStatus,
          input.history.newStatus,
          input.history.changedBy.id,
          input.history.observation,
          input.history.createdAt,
        ],
      );
      const fresh = await client.query<TicketRowWithJoins>(
        `${TICKET_SELECT} WHERE t.id = $1`,
        [input.ticketId],
      );
      const row = fresh.rows[0];
      if (row === undefined) {
        throw new Error(`Ticket ${input.ticketId} no encontrado tras transicion`);
      }
      return mapTicketRow(row);
    });
  }
}
