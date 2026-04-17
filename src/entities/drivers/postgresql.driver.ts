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
// }
import pg from 'pg';
const { Client } = pg;
import type { IDatabaseDriver } from "../core/db.js";

export class PostgreSqlDriver implements IDatabaseDriver {
    private client: pg.Client | null = null;
    private config: string | pg.ClientConfig;

    constructor(config: string | pg.ClientConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.client) return;
        this.client = new Client(this.config);
        await this.client.connect();
        // Health check
        await this.client.query("SELECT 1");
    }

    async disconnect(): Promise<void> {
        if (!this.client) return;
        await this.client.end();
        this.client = null;
    }

    async execute(query: string, params?: any[]): Promise<any> {
        if (!this.client) throw new Error("PostgreSQL not connected");
        
        // pg returns an object: { rows: [...], command: 'SELECT', rowCount: 1 }
        const result = await this.client.query(query, params);
        return result.rows; 
    }

    getPlaceholderPrefix(): string {
        return '$';
    }

    getNumberedPlaceholder(index: number): string {
        return `${this.getPlaceholderPrefix()}${index}`;
    }

    getInsertQuery(tableName: string, columns: string[]): string {
        const placeholders = columns.map((_, i) => this.getNumberedPlaceholder(i + 1)).join(', ');
        // Adding RETURNING * is a common PostgreSQL practice to get the inserted row back immediately
        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    }
}