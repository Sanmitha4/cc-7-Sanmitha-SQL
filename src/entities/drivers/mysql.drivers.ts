import type { ConnectionOptions } from "mysql2";
import type { IDatabaseDriver } from "../core/db.js";
import { createConnection, Connection } from "mysql2/promise";

export class MySqlDriver implements IDatabaseDriver {
    private connection: Connection | null = null;
    private connectionConfig: string | ConnectionOptions;

    constructor(connectionConfig: string | ConnectionOptions) {
        this.connectionConfig = connectionConfig;
    }

    async connect(): Promise<void> {
        if (this.connection) {
            return;
        }
        this.connection = await (typeof this.connectionConfig === "string" ? createConnection(this.connectionConfig) : createConnection(this.connectionConfig));
        await this.connection.query("SELECT 1");
    }

    async disconnect(): Promise<void> {
        if (!this.connection) {
            return;
        }
        await this.connection.end();
        this.connection = null;
    }

    async execute(query: string, params?: any[]): Promise<any> {
        if (!this.connection) {
            throw new Error("Not connected to the database");
        }
        const [results] = await this.connection.execute(query, params);
        return results;
    }
    
    getPlaceholderPrefix(): string {
        return '?';
    }
    getInsertQuery(tableName: string, columns: string[]): string {
        const placeholders = columns.map(() => this.getPlaceholderPrefix()).join(', ');
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    }

    getUpdateQuery(tableName: string, columns: string[], conditions: Record<string, unknown>): string {
        console.log("[SIMULATING]: Updating query...", tableName, columns, conditions);
        return ''
    }
    getDeleteQuery(tableName: string, conditions: Record<string, unknown>, limit?: number, offset?: number): string {
        console.log("[SIMULATING]: Deleting query...", tableName, conditions, limit, offset);
        return "";
    }
    getSelectQuery(tableName: string, columns: string[], conditions?: Record<string, unknown>, limit?: number, offset?: number): string {
        console.log("[SIMULATING]: Selecting query...", tableName, columns, conditions, limit, offset);
        return "";
    }
    getCountQuery(tableName: string, conditions?: Record<string, unknown>): string {
        console.log("[SIMULATING]: Counting query...", tableName, conditions);
        return "";
    }
}


