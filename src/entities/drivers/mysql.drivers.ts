// import type { ConnectionOptions } from "mysql2";
// import type { IDatabaseDriver } from "../core/db.js";
// import { createConnection, Connection } from "mysql2/promise";

// export class MySqlDriver implements IDatabaseDriver {
//     private connection: Connection | null = null;
//     private connectionConfig: string | ConnectionOptions;

//     constructor(connectionConfig: string | ConnectionOptions) {
//         this.connectionConfig = connectionConfig;
//     }

//     async connect(): Promise<void> {
//         if (this.connection) {
//             return;
//         }
//         this.connection = await (typeof this.connectionConfig === "string" ? createConnection(this.connectionConfig) : createConnection(this.connectionConfig));
//         await this.connection.query("SELECT 1");
//     }

//     async disconnect(): Promise<void> {
//         if (!this.connection) {
//             return;
//         }
//         await this.connection.end();
//         this.connection = null;
//     }

//     async execute(query: string, params?: any[]): Promise<any> {
//         if (!this.connection) {
//             throw new Error("Not connected to the database");
//         }
//         const [results] = await this.connection.execute(query, params);
//         return results;
//     }
    
//     getPlaceholderPrefix(): string {
//         return '?';
//     }
//     getInsertQuery(tableName: string, columns: string[]): string {
//         const placeholders = columns.map(() => this.getPlaceholderPrefix()).join(', ');
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
// }


import type { ConnectionOptions } from "mysql2";
import type { IDatabaseDriver } from "../core/db.js";
import { createConnection, type Connection } from "mysql2/promise";

const RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

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
                const conn = typeof this.connectionConfig === "string"
                    ? await createConnection(this.connectionConfig)
                    : await createConnection(this.connectionConfig);
                await conn.query("SELECT 1");
                this.connection = conn;
                console.log(`✅ MySQL connected (attempt ${attempt})`);
                return;
            } catch (err) {
                lastError = err;
                console.warn(`⏳ MySQL not ready yet (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
                await sleep(RETRY_DELAY_MS);
            }
        }
        throw new Error(`❌ Could not connect to MySQL after ${RETRY_ATTEMPTS} attempts.\nLast error: ${lastError}`);
    }

    async disconnect(): Promise<void> {
        if (!this.connection) return;
        await this.connection.end();
        this.connection = null;
    }

    async execute(query: string, params?: any[]): Promise<any> {
        if (!this.connection) throw new Error("Not connected to MySQL");
        const [results] = await this.connection.execute(query, params ?? []);
        return results;
    }

    getPlaceholderPrefix(): string {
        return "?";
    }

    // Upsert: insert or update all columns on duplicate primary key
    getInsertQuery(tableName: string, columns: string[]): string {
        const placeholders = columns.map(() => "?").join(", ");
        const updateClause = columns
            .filter((c) => c !== "id")
            .map((c) => `${c} = VALUES(${c})`)
            .join(", ");
        return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
    }

    getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
        const setClause = columns.map((col) => `${col} = ?`).join(", ");
        const condKeys = Object.keys(conditions);
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ?`).join(" AND ")}`
            : "";
        return `UPDATE ${tableName} SET ${setClause}${whereClause}`;
    }

    getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, _offset?: number): string {
        const condKeys = Object.keys(conditions);
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ?`).join(" AND ")}`
            : "";
        const limitClause = limit !== undefined ? ` LIMIT ${limit}` : "";
        return `DELETE FROM ${tableName}${whereClause}${limitClause}`;
    }

    getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
        const columnList = columns.join(", ");
        const condKeys = conditions ? Object.keys(conditions) : [];
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ?`).join(" AND ")}`
            : "";
        let limitClause = "";
        if (limit !== undefined) {
            limitClause = ` LIMIT ${limit}`;
            if (offset !== undefined) limitClause += ` OFFSET ${offset}`;
        }
        return `SELECT ${columnList} FROM ${tableName}${whereClause}${limitClause}`;
    }

    getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
        const condKeys = conditions ? Object.keys(conditions) : [];
        const whereClause = condKeys.length > 0
            ? ` WHERE ${condKeys.map((k) => `${k} = ?`).join(" AND ")}`
            : "";
        return `SELECT COUNT(*) as count FROM ${tableName}${whereClause}`;
    }
}