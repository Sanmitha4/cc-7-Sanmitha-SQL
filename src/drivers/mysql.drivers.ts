

import type { ConnectionOptions } from "mysql2";
import type { IDatabaseDriver } from "../core/db.js";
import { createConnection, type Connection } from "mysql2/promise";
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

export class MySqlDriver implements IDatabaseDriver {
  private connection: Connection | null = null;
  private connectionConfig: string | ConnectionOptions;

  constructor(connectionConfig: string | ConnectionOptions) {
    this.connectionConfig = connectionConfig;
  }

  async connect(): Promise<void> {
    if (this.connection) return;
    let lastError: unknown;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const conn =
          typeof this.connectionConfig === "string"
            ? await createConnection(this.connectionConfig)
            : await createConnection(this.connectionConfig);
        await conn.query("SELECT 1");
        this.connection = conn;
        console.log(`MySQL connected (attempt ${attempt})`);
        return;
      } catch (err) {
        lastError = err;
        console.warn(
          `MySQL not ready yet (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
    throw new Error(
      `Could not connect to MySQL after ${RETRY_ATTEMPTS} attempts.\nLast error: ${lastError}`,
    );
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.end();
    this.connection = null;
  }
  async execute(query: string, params?: any[]): Promise<any> {
    if (!this.connection) {
      throw new Error("Not connected to the database");
    }
    const [results] = await this.connection.execute(query, params);
    if (!query.includes("CREATE TABLE")) {
      console.log("SQL QUERY:", query);
      console.log("SQL PARAMS:", params ?? []);
    }
    if ((results as any).affectedRows !== undefined) {
      return Object.assign([], { affectedRows: (results as any).affectedRows });
    }

    return results;
  }

  getPlaceholderPrefix(): string {
    return "?";
  }

  private escapeIdentifier(identifier: string): string {
    const parts = identifier.split(".");
    return parts
      .map((part) => {
        if (!IDENTIFIER_SEGMENT_REGEX.test(part)) {
          throw new Error(`Invalid SQL identifier: ${identifier}`);
        }
        return `\`${part}\``;
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

  private buildGroup(operator: "AND" | "OR", nodes: WhereCondition[]): QueryWithParams {
    const sqlParts: string[] = [];
    const params: unknown[] = [];

    for (const node of nodes) {
      const built = this.buildCondition(node);
      if (!built.query) continue;
      sqlParts.push(`(${built.query})`);
      params.push(...built.params);
    }

    if (sqlParts.length === 0) return { query: "", params: [] };
    return { query: sqlParts.join(` ${operator} `), params };
  }

  private buildLeaf(condition: FilterCondition): QueryWithParams {
    const field = this.escapeIdentifier(condition.field);
    const operator = this.normalizeOperator(condition.operator);

    if (operator === "IN") {
      if (!Array.isArray(condition.value) || condition.value.length === 0) {
        throw new Error("IN operator requires a non-empty array value");
      }
      const placeholders = condition.value.map(() => "?").join(", ");
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

    return { query: `${field} ${operator} ?`, params: [condition.value] };
  }

  private buildFlatMap(condition: Record<string, unknown>): QueryWithParams {
    const entries = Object.entries(condition);
    if (entries.length === 0) return { query: "", params: [] };

    const sqlParts: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of entries) {
      sqlParts.push(`${this.escapeIdentifier(key)} = ?`);
      params.push(value);
    }

    return {
      query: sqlParts.join(" AND "),
      params,
    };
  }

  private buildCondition(condition: WhereCondition | undefined): QueryWithParams {
    if (!condition) return { query: "", params: [] };

    if (this.isGroupCondition(condition)) {
      const sections: string[] = [];
      const params: unknown[] = [];

      if (condition.AND && condition.AND.length > 0) {
        const andBuilt = this.buildGroup("AND", condition.AND);
        if (andBuilt.query) {
          sections.push(`(${andBuilt.query})`);
          params.push(...andBuilt.params);
        }
      }

      if (condition.OR && condition.OR.length > 0) {
        const orBuilt = this.buildGroup("OR", condition.OR);
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
      return this.buildLeaf(condition);
    }

    return this.buildFlatMap(condition as Record<string, unknown>);
  }

  private buildWhereClause(condition: WhereCondition | undefined): QueryWithParams {
    const built = this.buildCondition(condition);
    if (!built.query) return { query: "", params: [] };
    return { query: ` WHERE ${built.query}`, params: built.params };
  }

  private normalizePaginationValue(value: number, name: "LIMIT" | "OFFSET"): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${name} must be a non-negative integer`);
    }
    return value;
  }

  getInsertQuery(tableName: string, columns: string[]): string {
    const escapedTableName = this.escapeIdentifier(tableName);
    const escapedColumns = columns.map((col) => this.escapeIdentifier(col));
    const placeholders = columns.map(() => "?").join(", ");
    const updateClause = columns
      .filter((c) => c !== "id")
      .map((c) => {
        const escaped = this.escapeIdentifier(c);
        return `${escaped} = VALUES(${escaped})`;
      })
      .join(", ");
    return `INSERT INTO ${escapedTableName} (${escapedColumns.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
  }

  getUpdateQuery(
    tableName: string,
    columns: string[],
    conditions: WhereCondition,
  ): QueryWithParams {
    const escapedTableName = this.escapeIdentifier(tableName);
    const setClause = columns
      .map((col) => `${this.escapeIdentifier(col)} = ?`)
      .join(", ");
    const whereClause = this.buildWhereClause(conditions);
    return {
      query: `UPDATE ${escapedTableName} SET ${setClause}${whereClause.query}`,
      params: [...whereClause.params],
    };
  }

  getDeleteQuery(
    tableName: string,
    conditions: WhereCondition,
    limit?: number,
    _offset?: number,
  ): QueryWithParams {
    const escapedTableName = this.escapeIdentifier(tableName);
    const whereClause = this.buildWhereClause(conditions);
    const params = [...whereClause.params];
    let limitClause = "";
    if (limit !== undefined) {
      const safeLimit = this.normalizePaginationValue(limit, "LIMIT");
      limitClause = ` LIMIT ${safeLimit}`;
    }
    return {
      query: `DELETE FROM ${escapedTableName}${whereClause.query}${limitClause}`,
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
    const whereClause = this.buildWhereClause(conditions);
    const params = [...whereClause.params];
    let limitClause = "";
    if (limit !== undefined) {
      const safeLimit = this.normalizePaginationValue(limit, "LIMIT");
      limitClause = ` LIMIT ${safeLimit}`;
      if (offset !== undefined) {
        const safeOffset = this.normalizePaginationValue(offset, "OFFSET");
        limitClause += ` OFFSET ${safeOffset}`;
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
    const whereClause = this.buildWhereClause(conditions);
    return {
      query: `SELECT COUNT(*) as count FROM ${escapedTableName}${whereClause.query}`,
      params: whereClause.params,
    };
  }
}
