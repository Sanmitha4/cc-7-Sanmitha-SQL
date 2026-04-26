import type { QueryWithParams, WhereCondition } from "./query.types.js";

export interface IDatabaseDriver {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    execute(query: string, params?: any[]): Promise<any>;

    getPlaceholderPrefix(): string;
    getInsertQuery(tableName: string, columns: string[]): string;
    getUpdateQuery(tableName: string, columns: string[], conditions: WhereCondition): QueryWithParams;
    getDeleteQuery(tableName: string, conditions: WhereCondition, limit?: number, offset?: number): QueryWithParams;
    getSelectQuery(tableName: string, columns: string[], conditions?: WhereCondition, limit?: number, offset?: number): QueryWithParams;
    getCountQuery(tableName: string, conditions?: WhereCondition): QueryWithParams;
}

export class DB {
    private static instance: IDatabaseDriver;

    static setDriver(driver: IDatabaseDriver) {
        this.instance = driver;
    }

    static get driver(): IDatabaseDriver {
        if (!this.instance) {
            throw new Error("Database driver not set");
        }
        return this.instance;
    }
}