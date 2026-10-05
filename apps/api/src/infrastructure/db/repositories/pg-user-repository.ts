import type { UserRole, UserSummary } from "@soporte/shared";

import type { DbPool } from "../pool.js";
import type {
  UserRecord,
  UserRepository,
} from "../../../application/ports/index.js";
import type { UserRow } from "../types.js";

import { mapUserRow, toUserSummary } from "./row-mappers.js";

export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: DbPool) {}

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapUserRow(row);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    const row = result.rows[0];
    return row === undefined ? null : mapUserRow(row);
  }

  async create(input: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    now: string;
  }): Promise<UserRecord> {
    await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [
        input.id,
        input.name,
        input.email,
        input.passwordHash,
        input.role,
        input.now,
      ],
    );
    const created = await this.findByEmail(input.email);
    if (created === null) {
      throw new Error(`Usuario ${input.email} no aparecio tras INSERT`);
    }
    return created;
  }

  async list(): Promise<UserSummary[]> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, name, email, password_hash, role, created_at, updated_at
       FROM users
       ORDER BY name ASC`,
    );
    return result.rows.map(toUserSummary);
  }
}
