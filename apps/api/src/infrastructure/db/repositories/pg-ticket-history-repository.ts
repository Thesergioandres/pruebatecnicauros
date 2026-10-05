import type { Page, TicketHistoryEntry } from "@soporte/shared";

import type { DbPool } from "../pool.js";
import type {
  NewHistoryEntry,
  TicketHistoryRepository,
} from "../../../application/ports/index.js";

import {
  mapHistoryRow,
  type TicketHistoryRowWithJoins,
} from "./row-mappers.js";

const HISTORY_SELECT = `
  SELECT
    h.id, h.ticket_id, h.previous_status, h.new_status,
    h.changed_by_id, h.observation, h.created_at,
    u.name AS changed_by_name,
    u.email AS changed_by_email
  FROM ticket_history h
  JOIN users u ON u.id = h.changed_by_id
`;

interface CountRow {
  count: string;
}

export class PgTicketHistoryRepository implements TicketHistoryRepository {
  constructor(private readonly pool: DbPool) {}

  async listByTicket(
    ticketId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<Page<TicketHistoryEntry>> {
    const totalResult = await this.pool.query<CountRow>(
      `SELECT COUNT(*)::text AS count FROM ticket_history WHERE ticket_id = $1`,
      [ticketId],
    );
    const total = Number.parseInt(totalResult.rows[0]!.count, 10);
    const page = pagination.page;
    const pageSize = pagination.pageSize;
    const offset = (page - 1) * pageSize;

    const items = await this.pool.query<TicketHistoryRowWithJoins>(
      `${HISTORY_SELECT}
       WHERE h.ticket_id = $1
       ORDER BY h.created_at DESC, h.id DESC
       LIMIT $2 OFFSET $3`,
      [ticketId, pageSize, offset],
    );

    return {
      items: items.rows.map(mapHistoryRow),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async append(entry: NewHistoryEntry): Promise<TicketHistoryEntry> {
    const result = await this.pool.query<{ id: string } & TicketHistoryRowWithJoins>(
      `WITH inserted AS (
         INSERT INTO ticket_history (
           id, ticket_id, previous_status, new_status,
           changed_by_id, observation, created_at
         ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6)
         RETURNING id, ticket_id, previous_status, new_status,
                   changed_by_id, observation, created_at
       )
       SELECT i.id, i.ticket_id, i.previous_status, i.new_status,
              i.changed_by_id, i.observation, i.created_at,
              u.name AS changed_by_name,
              u.email AS changed_by_email
       FROM inserted i
       JOIN users u ON u.id = i.changed_by_id`,
      [
        entry.ticketId,
        entry.previousStatus,
        entry.newStatus,
        entry.changedBy.id,
        entry.observation,
        entry.createdAt,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("No se pudo insertar la entrada de historial");
    }
    return mapHistoryRow(row);
  }
}
