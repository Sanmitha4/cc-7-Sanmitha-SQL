import pg from "pg";
const { Client } = pg;
import type { IDatabaseDriver } from "../core/db.js";

const RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PostgreSqlDriver implements IDatabaseDriver {
  private client: pg.Client | null = null;
  private config: string | pg.ClientConfig;

  constructor(config: string | pg.ClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.client) return;
    let lastError: unknown;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      const client = new Client(this.config);
      try {
        await client.connect();
        await client.query("SELECT 1");
        this.client = client;
        console.log(`PostgreSQL connected (attempt ${attempt})`);
        return;
      } catch (err) {
        lastError = err;
        try {
          await client.end();
        } catch {
          /* ignore */
        }
        console.warn(
          `PostgreSQL not ready yet (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
    throw new Error(
      `Could not connect to PostgreSQL after ${RETRY_ATTEMPTS} attempts.\nLast error: ${lastError}`,
    );
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await this.client.end();
    this.client = null;
  }

  async execute(query: string, params?: any[]): Promise<any> {
    if (!this.client) throw new Error("PostgreSQL not connected");

    const result = await this.client.query(query, params ?? []);

    if (!query.includes("CREATE TABLE")) {
      console.log("SQL QUERY:", query);
      console.log("SQL PARAMS:", params ?? []);
    }

    if (["INSERT", "UPDATE", "DELETE"].includes(result.command)) {
      return Object.assign(result.rows, { affectedRows: result.rowCount ?? 0 });
    }

    return result.rows;
  }

  getPlaceholderPrefix(): string {
    return "$";
  }

  private placeholder(index: number): string {
    return `$${index}`;
  }

  private buildWhereClause(
    conditions: Record<string, unknown> | undefined,
    startIndex: number,
  ): string {
    const keys = conditions ? Object.keys(conditions) : [];
    if (keys.length === 0) return "";

    let idx = startIndex;
    const clause = keys
      .map((k) => `${k} = ${this.placeholder(idx++)}`)
      .join(" AND ");
    return ` WHERE ${clause}`;
  }

  getInsertQuery(tableName: string, columns: string[]): string {
    const placeholders = columns
      .map((_, i) => this.placeholder(i + 1))
      .join(", ");
    const updateClause = columns
      .filter((c) => c !== "id")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause} RETURNING *`;
  }

  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: Record<string, unknown>,
  ): string {
    const setClause = columns
      .map((col, i) => `${col} = ${this.placeholder(i + 1)}`)
      .join(", ");

    const whereClause = this.buildWhereClause(conditions, columns.length + 1);

    return `UPDATE ${tableName} SET ${setClause}${whereClause} RETURNING *`;
  }

  getDeleteQuery(
    tableName: string,
    conditions: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    const whereClause = this.buildWhereClause(conditions, 1);

    if (limit !== undefined) {
      const offsetClause = offset !== undefined ? ` OFFSET ${offset}` : "";
      return `DELETE FROM ${tableName} WHERE ctid IN (SELECT ctid FROM ${tableName}${whereClause} LIMIT ${limit}${offsetClause}) RETURNING *`;
    }
    return `DELETE FROM ${tableName}${whereClause} RETURNING *`;
  }

  getSelectQuery(
    tableName: string,
    columns: string[],
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): string {
    const columnList = columns.join(", ");
    const whereClause = this.buildWhereClause(conditions, 1);

    let limitClause = "";
    if (limit !== undefined) {
      limitClause = ` LIMIT ${limit}`;
      if (offset !== undefined) limitClause += ` OFFSET ${offset}`;
    }

    return `SELECT ${columnList} FROM ${tableName}${whereClause}${limitClause}`;
  }

  getCountQuery(
    tableName: string,
    conditions?: Record<string, unknown>,
  ): string {
    const whereClause = this.buildWhereClause(conditions, 1);
    return `SELECT COUNT(*) as count FROM ${tableName}${whereClause}`;
  }
}
