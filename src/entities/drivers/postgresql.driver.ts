// import type { IDatabaseDriver } from "../core/db.js";


// export class PostgreSqlDriver implements IDatabaseDriver {
//     connect(): Promise<void> {
//         console.log("[SIMULATING]: Connecting to MySQL database...");
//         return Promise.resolve();
//     }
//     disconnect(): Promise<void> {
//         console.log("[SIMULATING]: Disconnecting from MySQL database...");
//         return Promise.resolve();
//     }
//     execute(query: string, params?: any[]): Promise<any> {
//         console.log("[SIMULATING]: Executing query...", query, params);
//         return Promise.resolve();
//     }

//     getPlaceholderPrefix(): string {
//         return '$';
//     }
//     getNumberedPlaceholder(index: number): string {
//         return `${this.getPlaceholderPrefix()}${index}`;
//     }
//     getInsertQuery(tableName: string, columns: string[]): string {
//         const placeholders = columns.map((_, i) => this.getNumberedPlaceholder(i + 1)).join(', ');
//         return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
//     }
//     getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
//         console.log("[SIMULATING]: Updating query...", tableName, columns, conditions);
//         return ''
//     }
//     getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string {
//         console.log("[SIMULATING]: Deleting query...", tableName, conditions, limit, offset);
//         return "";
//     }
//     getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
//         console.log("[SIMULATING]: Selecting query...", tableName, columns, conditions, limit, offset);
//         return "";
//     }
//     getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
//         console.log("[SIMULATING]: Counting query...", tableName, conditions);
//         return "";
//     }
// // }
// import pg from 'pg';
// const { Client } = pg;
// import type { IDatabaseDriver } from "../core/db.js";

// export class PostgreSqlDriver implements IDatabaseDriver {
//     private client: pg.Client | null = null;
//     private config: string | pg.ClientConfig;

//     constructor(config: string | pg.ClientConfig) {
//         this.config = config;
//     }

//     async connect(): Promise<void> {
//         if (this.client) return;
//         this.client = new Client(this.config);
//         await this.client.connect();
//         // Health check
//         await this.client.query("SELECT 1");
//     }

//     async disconnect(): Promise<void> {
//         if (!this.client) return;
//         await this.client.end();
//         this.client = null;
//     }

//     async execute(query: string, params?: any[]): Promise<any> {
//         if (!this.client) throw new Error("PostgreSQL not connected");
        
//         // pg returns an object: { rows: [...], command: 'SELECT', rowCount: 1 }
//         const result = await this.client.query(query, params);
//         return result.rows; 
//     }

//     getPlaceholderPrefix(): string {
//         return '$';
//     }

//     getNumberedPlaceholder(index: number): string {
//         return `${this.getPlaceholderPrefix()}${index}`;
//     }

//     getInsertQuery(tableName: string, columns: string[]): string {
//         const placeholders = columns.map((_, i) => this.getNumberedPlaceholder(i + 1)).join(', ');
//         return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
//     }

//     getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
//         let paramIndex = 1;
//         const setClause = columns.map(col => `${col} = ${this.getNumberedPlaceholder(paramIndex++)}`).join(', ');
//         const conditionKeys = Object.keys(conditions);
//         const whereClause = conditionKeys.length > 0 ? ` WHERE ${conditionKeys.map(k => `${k} = ${this.getNumberedPlaceholder(paramIndex++)}`).join(' AND ')}` : '';
//         return `UPDATE ${tableName} SET ${setClause}${whereClause} RETURNING *`;
//     }

//     getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string {
//         const conditionKeys = Object.keys(conditions);
//         const whereClause = conditionKeys.length > 0 ? ` WHERE ${conditionKeys.map((k, i) => `${k} = ${this.getNumberedPlaceholder(i + 1)}`).join(' AND ')}` : '';
//         let limitClause = '';
//         if (limit !== undefined) {
//             const offsetParamIdx = Object.keys(conditions).length + 1;
//             limitClause = ` LIMIT ${this.getNumberedPlaceholder(offsetParamIdx)}`;
//             if (offset !== undefined) {
//                 limitClause += ` OFFSET ${this.getNumberedPlaceholder(offsetParamIdx + 1)}`;
//             }
//         }
//         return `DELETE FROM ${tableName}${whereClause}${limitClause} RETURNING *`;
//     }

//     getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
//         const columnList = columns.join(', ');
//         const conditionKeys = conditions ? Object.keys(conditions) : [];
//         const whereClause = conditionKeys.length > 0 ? ` WHERE ${conditionKeys.map((k, i) => `${k} = ${this.getNumberedPlaceholder(i + 1)}`).join(' AND ')}` : '';
//         let limitClause = '';
//         let paramOffset = conditionKeys.length;
//         if (limit !== undefined) {
//             limitClause = ` LIMIT ${this.getNumberedPlaceholder(++paramOffset)}`;
//             if (offset !== undefined) {
//                 limitClause += ` OFFSET ${this.getNumberedPlaceholder(++paramOffset)}`;
//             }
//         }
//         return `SELECT ${columnList} FROM ${tableName}${whereClause}${limitClause}`;
//     }

//     getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
//         const conditionKeys = conditions ? Object.keys(conditions) : [];
//         const whereClause = conditionKeys.length > 0 ? ` WHERE ${conditionKeys.map((k, i) => `${k} = ${this.getNumberedPlaceholder(i + 1)}`).join(' AND ')}` : '';
//         return `SELECT COUNT(*) as count FROM ${tableName}${whereClause}`;
//     }
// }
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
                try { await client.end(); } catch { /* ignore */ }
                console.warn(` PostgreSQL not ready yet (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
                await sleep(RETRY_DELAY_MS);
            }
        }
        throw new Error(`Could not connect to PostgreSQL after ${RETRY_ATTEMPTS} attempts.\nLast error: ${lastError}`);
    }

    async disconnect(): Promise<void> {
        if (!this.client) return;
        await this.client.end();
        this.client = null;
    }

    async execute(query: string, params?: any[]): Promise<any> {
        if (!this.client) throw new Error("PostgreSQL not connected");
        const result = await this.client.query(query, params ?? []);
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

    // Upsert: INSERT … ON CONFLICT (id) DO UPDATE SET …
    getInsertQuery(tableName: string, columns: string[]): string {
        const placeholders = columns.map((_, i) => this.placeholder(i + 1)).join(", ");
        const updateClause = columns
            .filter((c) => c !== "id")
            .map((c) => `${c} = EXCLUDED.${c}`)
            .join(", ");
        return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause} RETURNING *`;
    }

    getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
        let idx = 1;
        const setClause = columns.map((col) => `${col} = ${this.placeholder(idx++)}`).join(", ");
        const condKeys = Object.keys(conditions);
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ${this.placeholder(idx++)}`).join(" AND ")}`
            : "";
        return `UPDATE ${tableName} SET ${setClause}${whereClause} RETURNING *`;
    }

    getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string {
        let idx = 1;
        const condKeys = Object.keys(conditions);
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ${this.placeholder(idx++)}`).join(" AND ")}`
            : "";
        if (limit !== undefined) {
            const offsetClause = offset !== undefined ? ` OFFSET ${offset}` : "";
            return `DELETE FROM ${tableName} WHERE ctid IN (SELECT ctid FROM ${tableName}${whereClause} LIMIT ${limit}${offsetClause}) RETURNING *`;
        }
        return `DELETE FROM ${tableName}${whereClause} RETURNING *`;
    }

    getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
        const columnList = columns.join(", ");
        let idx = 1;
        const condKeys = conditions ? Object.keys(conditions) : [];
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ${this.placeholder(idx++)}`).join(" AND ")}`
            : "";
        // LIMIT/OFFSET are safe integers — embed as literals, not params
        let limitClause = "";
        if (limit !== undefined) {
            limitClause = ` LIMIT ${limit}`;
            if (offset !== undefined) limitClause += ` OFFSET ${offset}`;
        }
        return `SELECT ${columnList} FROM ${tableName}${whereClause}${limitClause}`;
    }

    getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
        let idx = 1;
        const condKeys = conditions ? Object.keys(conditions) : [];
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ${this.placeholder(idx++)}`).join(" AND ")}`
            : "";
        return `SELECT COUNT(*) as count FROM ${tableName}${whereClause}`;
    }
}