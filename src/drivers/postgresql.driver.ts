import pg from "pg";
const { Client } = pg;
import type { IDatabaseDriver } from "../core/db.js";
import type {
  FilterCondition,
  QueryWithParams,
  WhereCondition,
} from "../core/query.types.js";

const RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;
const IDENTIFIER_SEGMENT_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SUPPORTED_OPERATORS = new Set([
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "LIKE",
  "IN",
  "IS",
  "IS NOT",
]);

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

  private escapeIdentifier(identifier: string): string {
    const parts = identifier.split(".");
    return parts
      .map((part) => {
        const normalized = part.toLowerCase();
        if (!IDENTIFIER_SEGMENT_REGEX.test(normalized)) {
          throw new Error(`Invalid SQL identifier: ${identifier}`);
        }
        return `"${normalized}"`;
      })
      .join(".");
  }

  private normalizeOperator(operator: string | undefined): string {
    const normalized = (operator ?? "=").toUpperCase();
    if (!SUPPORTED_OPERATORS.has(normalized)) {
      throw new Error(`Unsupported operator: ${operator}`);
    }
    return normalized;
  }

  private isGroupCondition(
    condition: WhereCondition,
  ): condition is { AND?: WhereCondition[]; OR?: WhereCondition[] } {
    return (
      typeof condition === "object" &&
      condition !== null &&
      ("AND" in condition || "OR" in condition)
    );
  }

  private isFilterCondition(condition: WhereCondition): condition is FilterCondition {
    return (
      typeof condition === "object" &&
      condition !== null &&
      "field" in condition &&
      "value" in condition
    );
  }

  private buildGroup(
    operator: "AND" | "OR",
    nodes: WhereCondition[],
    indexRef: { value: number },
  ): QueryWithParams {
    const sqlParts: string[] = [];
    const params: unknown[] = [];

    for (const node of nodes) {
      const built = this.buildCondition(node, indexRef);
      if (!built.query) continue;
      sqlParts.push(`(${built.query})`);
      params.push(...built.params);
    }

    if (sqlParts.length === 0) return { query: "", params: [] };
    return { query: sqlParts.join(` ${operator} `), params };
  }

  private buildLeaf(
    condition: FilterCondition,
    indexRef: { value: number },
  ): QueryWithParams {
    const field = this.escapeIdentifier(condition.field);
    const operator = this.normalizeOperator(condition.operator);

    if (operator === "IN") {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        throw new Error("IN operator requires a non-empty array value");
      }

      const placeholders = condition.value.map(() => this.placeholder(indexRef.value++)).join(", ");
      return {
        query: `${field} IN (${placeholders})`,
        params: [...condition.value],
      };
    }

    if (operator === "IS" || operator === "IS NOT") {
      if (condition.value !== null) {
        throw new Error(`${operator} operator only supports null`);
      }
      return { query: `${field} ${operator} NULL`, params: [] };
    }

    const placeholder = this.placeholder(indexRef.value++);
    return { query: `${field} ${operator} ${placeholder}`, params: [condition.value] };
  }

  private buildFlatMap(
    condition: Record<string, unknown>,
    indexRef: { value: number },
  ): QueryWithParams {
    const entries = Object.entries(condition);
    if (entries.length === 0) return { query: "", params: [] };

    const sqlParts: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of entries) {
      sqlParts.push(`${this.escapeIdentifier(key)} = ${this.placeholder(indexRef.value++)}`);
      params.push(value);
    }

    return {
      query: sqlParts.join(" AND "),
      params,
    };
  }

  private buildCondition(
    condition: WhereCondition | undefined,
    indexRef: { value: number },
  ): QueryWithParams {
    if (!condition) return { query: "", params: [] };

    if (this.isGroupCondition(condition)) {
      const sections: string[] = [];
      const params: unknown[] = [];

      if (condition.AND && condition.AND.length > 0) {
        const andBuilt = this.buildGroup("AND", condition.AND, indexRef);
        if (andBuilt.query) {
          sections.push(`(${andBuilt.query})`);
          params.push(...andBuilt.params);
        }
      }

      if (condition.OR && condition.OR.length > 0) {
        const orBuilt = this.buildGroup("OR", condition.OR, indexRef);
        if (orBuilt.query) {
          sections.push(`(${orBuilt.query})`);
          params.push(...orBuilt.params);
        }
      }

      return {
        query: sections.join(" AND "),
        params,
      };
    }

    if (this.isFilterCondition(condition)) {
      return this.buildLeaf(condition, indexRef);
    }

    return this.buildFlatMap(condition as Record<string, unknown>, indexRef);
  }

  private buildWhereClause(
    condition: WhereCondition | undefined,
    startIndex: number,
  ): QueryWithParams {
    const indexRef = { value: startIndex };
    const built = this.buildCondition(condition, indexRef);
    if (!built.query) return { query: "", params: [] };
    return { query: ` WHERE ${built.query}`, params: built.params };
  }

  getInsertQuery(tableName: string, columns: string[]): string {
    const escapedTableName = this.escapeIdentifier(tableName);
    const escapedColumns = columns.map((col) => this.escapeIdentifier(col));
    const placeholders = columns
      .map((_, i) => this.placeholder(i + 1))
      .join(", ");
      //It uses .filter((c) => c !== "id") to ensure you are never attempting to update the primary key during an upsert, which would cause a database error.
    const updateClause = columns
      .filter((c) => c !== "id")
      .map((c) => {
        const escaped = this.escapeIdentifier(c);
        return `${escaped} = EXCLUDED.${escaped}`;
      })
      .join(", ");
    return `INSERT INTO ${escapedTableName} (${escapedColumns.join(", ")}) VALUES (${placeholders}) ON CONFLICT ("id") DO UPDATE SET ${updateClause} RETURNING *`;
  }

  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: WhereCondition,
  ): QueryWithParams {
    const escapedTableName = this.escapeIdentifier(tableName);
    const setClause = columns
      .map((col, i) => `${this.escapeIdentifier(col)} = ${this.placeholder(i + 1)}`)
      .join(", ");

    const whereClause = this.buildWhereClause(conditions, columns.length + 1);

    return {
      query: `UPDATE ${escapedTableName} SET ${setClause}${whereClause.query} RETURNING *`,
      params: whereClause.params,
    };
  }

  getDeleteQuery(
    tableName: string,
    conditions: WhereCondition,
    limit?: number,
    offset?: number,
  ): QueryWithParams {
    const escapedTableName = this.escapeIdentifier(tableName);
    const whereClause = this.buildWhereClause(conditions, 1);
    const params = [...whereClause.params];

    if (limit !== undefined) {
      const limitPlaceholder = this.placeholder(params.length + 1);
      params.push(limit);
      let offsetClause = "";
      if (offset !== undefined) {
        offsetClause = ` OFFSET ${this.placeholder(params.length + 1)}`;
        params.push(offset);
      }
      return {
        query: `DELETE FROM ${escapedTableName} WHERE ctid IN (SELECT ctid FROM ${escapedTableName}${whereClause.query} LIMIT ${limitPlaceholder}${offsetClause}) RETURNING *`,
        params,
      };
    }
    return {
      query: `DELETE FROM ${escapedTableName}${whereClause.query} RETURNING *`,
      params,
    };
  }

  getSelectQuery(
    tableName: string,
    columns: string[],
    conditions?: WhereCondition,
    limit?: number,
    offset?: number,
  ): QueryWithParams {
    const escapedTableName = this.escapeIdentifier(tableName);
    const columnList = columns
      .map((col) => (col === "*" ? "*" : this.escapeIdentifier(col)))
      .join(", ");
    const whereClause = this.buildWhereClause(conditions, 1);
    const params = [...whereClause.params];

    let limitClause = "";
    if (limit !== undefined) {
      limitClause = ` LIMIT ${this.placeholder(params.length + 1)}`;
      params.push(limit);
      if (offset !== undefined) {
        limitClause += ` OFFSET ${this.placeholder(params.length + 1)}`;
        params.push(offset);
      }
    }

    return {
      query: `SELECT ${columnList} FROM ${escapedTableName}${whereClause.query}${limitClause}`,
      params,
    };
  }

  getCountQuery(
    tableName: string,
    conditions?: WhereCondition,
  ): QueryWithParams {
    const escapedTableName = this.escapeIdentifier(tableName);
    const whereClause = this.buildWhereClause(conditions, 1);
    return {
      query: `SELECT COUNT(*) as count FROM ${escapedTableName}${whereClause.query}`,
      params: whereClause.params,
    };
  }
}
