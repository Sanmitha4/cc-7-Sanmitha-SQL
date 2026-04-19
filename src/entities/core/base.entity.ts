// import 'reflect-metadata';
// import { TABLE_METADATA_KEY } from '../table.decorator.js';
// import { DB } from './db.js';
// import { Column } from './column.decorator.js';

// export interface IBaseEntity {
//     id?: number|undefined;
//     @Column()
//     createdAt: Date;
//     @Column()
//     createdBy: number;
//     @Column()
//     updatedAt: Date;
//     @Column()
//     updatedBy: number;
// }

// export interface IPagination {
//     limit?: number;
//     offset?: number;
// }

// export abstract class BaseEntity implements IBaseEntity {
//     id: number;
//     createdAt: Date;
//     createdBy: number;
//     updatedAt: Date;
//     updatedBy: number;

//     constructor(entity: IBaseEntity) {
//         this.id = entity.id;
//         this.createdAt = entity.createdAt || new Date();
//         this.createdBy = entity.createdBy;
//         this.updatedAt = entity.updatedAt || new Date();
//         this.updatedBy = entity.updatedBy;
//     }


//     private static buildWhere(conditions?: Record<string, any>): { sql: string; values: any[] } {
//         if (!conditions || Object.keys(conditions).length === 0) return { sql: '', values: [] };
//         const keys = Object.keys(conditions);
//         return {
//             sql: ` WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}`,
//             values: Object.values(conditions)
//         };
//     }

//     private static buildLimit(limit?: number, offset?: number): { sql: string; values: any[] } {
//         let sql = '';
//         const values: number[] = [];
//         if (limit !== undefined) {
//             sql += ` LIMIT ?`;
//             values.push(limit);
//             if (offset !== undefined) {
//                 sql += ` OFFSET ?`;
//                 values.push(offset);
//             }
//         }
//         return { sql, values };
//     }

//     static getTableName(): string {
//         return Reflect.getMetadata(TABLE_METADATA_KEY, this);
//     }

//     async save(): Promise<void> {
//         const tableName = (this.constructor as typeof BaseEntity).getTableName();
//         const keys = Object.keys(this);
//         const columns = keys.join(', ');
//         const placeholders = keys.map(() => '?').join(', ');
//         const updateClause = keys.map(k => `${k} = VALUES(${k})`).join(', ');

//         const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
//         await db.execute(query, Object.values(this));
//     }

//     static async findAll<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions?: Partial<I>,
//         pagination?: IPagination
//     ): Promise<T[]> {
//         const table = (this as any).getTableName();
//         const { sql: where, values: wVals } = (this as any).buildWhere(conditions);
//         const { sql: limit, values: lVals } = (this as any).buildLimit(pagination?.limit, pagination?.offset);

//         const rows = await db.execute(`SELECT * FROM ${table}${where}${limit}`, [...wVals, ...lVals]) as I[];
//         return rows.map(data => new this(data));
//     }
//     static async findOne<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions: Partial<I>
//     ): Promise<T | null> {
//         const { sql: where, values } = (this as any).buildWhere(conditions);
//         const query = `SELECT * FROM ${(this as any).getTableName()}${where} LIMIT 1`;
        
//         const rows = await db.execute(query, values) as I[];
//         return rows[0] ? new this(rows[0]) : null;
//     }

//     static async deleteById(id: number): Promise<number> {
//         const result: any = await db.execute(`DELETE FROM ${this.getTableName()} WHERE id = ?`, [id]);
//         return result.affectedRows || 0;
//     }

//     static async deleteOne<I extends IBaseEntity>(conditions: Partial<I>): Promise<number> {
//         const { sql: where, values } = (this as any).buildWhere(conditions);
//         const query = `DELETE FROM ${(this as any).getTableName()}${where} LIMIT 1`;
        
//         const result: any = await db.execute(query, values);
//         return result.affectedRows || 0;
//     }

//     static async deleteAll<I extends IBaseEntity>(conditions?: Partial<I>, limit?: number): Promise<number> {
//         const { sql: where, values: wVals } = (this as any).buildWhere(conditions);
//         const { sql: lim, values: lVals } = (this as any).buildLimit(limit);

//         const query = `DELETE FROM ${this.getTableName()}${where}${lim}`;
//         const result: any = await db.execute(query, [...wVals, ...lVals]);
//         return result.affectedRows || 0;
//     }
// }

// async save(): Promise<void> {
//     const tableName = (this.constructor as typeof BaseEntity).getTableName();
//     const whiteListedColumns: string[] = Reflect.getMetadata(COLUMN_METADATA_KEY, this) || [];
//     const baseColumns = ['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'];
//     const allColumns = [...baseColumns, ...whiteListedColumns];
//     const values = allColumns.map(key => (this as any)[key]);
//     const query = DB.driver.getInsertQuery(tableName, allColumns);
//     await DB.driver.execute(query, values);
// }

// import { DB } from "./db.js";
// import { Column, getColumnSqlName } from "./column.decorator.js";
// import { TABLE_METADATA_KEY } from "./table.decorator.js";

// export interface IBaseEntity {
//     id?: number | undefined;

//     createdAt: Date;
//     createdBy: number;
//     updatedAt: Date;
//     updatedBy: number;
// }

// export interface IPagination {
//     limit?: number;
//     offset?: number;
// }

// export abstract class BaseEntity implements IBaseEntity {

//     @Column()
//     id?: number | undefined;

//     @Column()
//     createdAt: Date;
//     @Column()
//     createdBy: number;
//     @Column()
//     updatedAt: Date;
//     @Column()
//     updatedBy: number;

//     constructor(entity: IBaseEntity) {
//         this.id = entity.id;
//         this.createdAt = entity.createdAt;
//         this.createdBy = entity.createdBy;
//         this.updatedAt = entity.updatedAt;
//         this.updatedBy = entity.updatedBy;
//     }

//     async save(): Promise<void> {
//         const ctor = this.constructor;
//         const proto = Object.getPrototypeOf(this) as object;
//         const keys = Object.keys(this);
//         console.log(keys);
        
//         const columnsMetadata = keys.map((k) => getColumnSqlName(proto, k)).filter((metadata) => metadata.dbColumnName);
//         const values = columnsMetadata.map((col) => (this as any)[col.propertyName]);
//         const columns = columnsMetadata.map((col) => col.dbColumnName);
//         const query = DB.driver.getInsertQuery(Reflect.getMetadata(TABLE_METADATA_KEY, ctor), columns);
//         await DB.driver.execute(query, values);
//     }
//     static async findAll<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions?: Record<string, unknown>, limit?: number, offset?: number): Promise<T[]> {
//         const query = DB.driver.getSelectQuery(Reflect.getMetadata(TABLE_METADATA_KEY, this), ['*'], conditions, limit, offset);
//         const result = await DB.driver.execute(query);
//         return result.map((row: any) => new this(row));
//     }
//     static async findOne<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions: Record<string, unknown>): Promise<T | null> {
//         const results = await (this as any).findAll(conditions);
//         return results.length > 0 ? results[0] : null;
//     }
//     static async findById<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, id: number): Promise<T | null> {
//         return await (this as any).findOne({ id });
//     }
//     static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions: Record<string, unknown>, limit?: number, offset?: number): Promise<number> {
//         const query = DB.driver.getDeleteQuery(Reflect.getMetadata(TABLE_METADATA_KEY, this), conditions, limit, offset);
//         const result = await DB.driver.execute(query);
//         return result.affectedRows;
//     }
//     static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions: Record<string, unknown>): Promise<boolean> {
//         const affectedRows = await (this as any).deleteAll(conditions, 1);
//         return affectedRows > 0;
//     }
//     static async deleteById<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, id: number): Promise<boolean> {
//         return await (this as any).deleteOne({ id });
//     }
//     static async count<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions?: Record<string, unknown>): Promise<number> {
//         const query = DB.driver.getCountQuery(Reflect.getMetadata(TABLE_METADATA_KEY, this), conditions);
//         const result = await DB.driver.execute(query);
//         return result[0].count;
//     }
//     static async updateAll<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, updates: Record<string, unknown>, conditions: Record<string, unknown>): Promise<number> {
//         const query = DB.driver.getUpdateQuery(Reflect.getMetadata(TABLE_METADATA_KEY, this), Object.keys(updates), conditions);
//         const params = [...Object.values(updates), ...Object.values(conditions)];
//         const result = await DB.driver.execute(query, params);
//         return result.affectedRows;
//     }
//     static async updateById<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, id: number, updates: Record<string, unknown>): Promise<boolean> {
//         const affectedRows = await (this as any).updateAll(updates, { id });
//         return affectedRows > 0;
//     }
// }

// import "reflect-metadata";
// import { DB } from "./db.js";
// import { Column, getColumnSqlName } from "./column.decorator.js";
// import { TABLE_METADATA_KEY } from "./table.decorator.js";

// export interface IBaseEntity {
//     id?: number | undefined;
//     createdAt: Date;
//     createdBy: number;
//     updatedAt: Date;
//     updatedBy: number;
// }

// export interface IPagination {
//     limit?: number;
//     offset?: number;
// }

// export abstract class BaseEntity implements IBaseEntity {
//     @Column()
//     id?: number | undefined;

//     @Column()
//     createdAt: Date;
//     @Column()
//     createdBy: number;
//     @Column()
//     updatedAt: Date;
//     @Column()
//     updatedBy: number;

//     constructor(entity: IBaseEntity) {
//         this.id = entity.id;
//         this.createdAt = entity.createdAt;
//         this.createdBy = entity.createdBy;
//         this.updatedAt = entity.updatedAt;
//         this.updatedBy = entity.updatedBy;
//     }

//     static getTableName(): string {
//         return Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
//     }

//     async save(): Promise<void> {
//         const ctor = this.constructor;
//         const proto = Object.getPrototypeOf(this) as object;
//         const keys = Object.keys(this);

//         const columnsMetadata = keys
//             .map((k) => getColumnSqlName(proto, k))
//             .filter((metadata) => metadata.dbColumnName !== "");

//         const values = columnsMetadata.map((col) => (this as any)[col.propertyName]);
//         const columns = columnsMetadata.map((col) => col.dbColumnName);
//         const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, ctor) as string;
//         const query = DB.driver.getInsertQuery(tableName, columns);
//         await DB.driver.execute(query, values);
//     }

//     static async findAll<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions?: Record<string, unknown>,
//         limit?: number,
//         offset?: number
//     ): Promise<T[]> {
//         const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
//         const conditionValues = conditions ? Object.values(conditions) : [];
//         const query = DB.driver.getSelectQuery(tableName, ["*"], conditions, limit, offset);
//         const result = await DB.driver.execute(query, conditionValues);
//         return result.map((row: any) => new this(row));
//     }

//     static async findOne<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions: Record<string, unknown>
//     ): Promise<T | null> {
//         const results = await (this as any).findAll(conditions, 1);
//         return results.length > 0 ? results[0] : null;
//     }

//     static async findById<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         id: number
//     ): Promise<T | null> {
//         return await (this as any).findOne({ id });
//     }

//     static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions: Record<string, unknown>,
//         limit?: number,
//         offset?: number
//     ): Promise<number> {
//         const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
//         const conditionValues = Object.values(conditions);
//         const query = DB.driver.getDeleteQuery(tableName, conditions, limit, offset);
//         const result = await DB.driver.execute(query, conditionValues);
//         return result.affectedRows ?? 0;
//     }

//     static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions: Record<string, unknown>
//     ): Promise<boolean> {
//         const affectedRows = await (this as any).deleteAll(conditions, 1);
//         return affectedRows > 0;
//     }

//     static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         id: number
//     ): Promise<boolean> {
//         return await (this as any).deleteOne({ id });
//     }

//     static async count<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         conditions?: Record<string, unknown>
//     ): Promise<number> {
//         const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
//         const conditionValues = conditions ? Object.values(conditions) : [];
//         const query = DB.driver.getCountQuery(tableName, conditions);
//         const result = await DB.driver.execute(query, conditionValues);
//         return Number(result[0].count);
//     }

//     static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         updates: Record<string, unknown>,
//         conditions: Record<string, unknown>
//     ): Promise<number> {
//         const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
//         const query = DB.driver.getUpdateQuery(tableName, Object.keys(updates), conditions);
//         const params = [...Object.values(updates), ...Object.values(conditions)];
//         const result = await DB.driver.execute(query, params);
//         return result.affectedRows ?? 0;
//     }

//     static async updateById<T extends BaseEntity, I extends IBaseEntity>(
//         this: new (entity: I) => T,
//         id: number,
//         updates: Record<string, unknown>
//     ): Promise<boolean> {
//         const affectedRows = await (this as any).updateAll(updates, { id });
//         return affectedRows > 0;
//     }
// }

import "reflect-metadata";
import { DB } from "./db.js";
import { Column, getColumnSqlName } from "./column.decorator.js";
import { TABLE_METADATA_KEY } from "./table.decorator.js";

export interface IBaseEntity {
    id?: number | undefined;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number;
}

export interface IPagination {
    limit?: number;
    offset?: number;
}

// Raw DB rows from SELECT come back with lowercase keys (createdat, createdby, etc.)
// This helper maps them back to the camelCase TS interface fields.
export function normaliseBaseRow(row: any): IBaseEntity {
    return {
        id:        row.id,
        createdAt: row.createdat  ?? row.createdAt  ?? row.created_at,
        createdBy: row.createdby  ?? row.createdBy  ?? row.created_by,
        updatedAt: row.updatedat  ?? row.updatedAt  ?? row.updated_at,
        updatedBy: row.updatedby  ?? row.updatedBy  ?? row.updated_by,
    };
}

export abstract class BaseEntity implements IBaseEntity {
    @Column("id")
    id?: number | undefined;

    // Lowercase DB column names — no quoting required in either MySQL or PostgreSQL
    @Column("createdat")
    createdAt: Date;

    @Column("createdby")
    createdBy: number;

    @Column("updatedat")
    updatedAt: Date;

    @Column("updatedby")
    updatedBy: number;

    constructor(entity: IBaseEntity | Record<string, any>) {
        const e = entity as any;
        this.id        = e.id;
        this.createdAt = e.createdAt  ?? e.createdat  ?? e.created_at;
        this.createdBy = e.createdBy  ?? e.createdby  ?? e.created_by;
        this.updatedAt = e.updatedAt  ?? e.updatedat  ?? e.updated_at;
        this.updatedBy = e.updatedBy  ?? e.updatedby  ?? e.updated_by;
    }

    static getTableName(): string {
        return Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    }

    async save(): Promise<void> {
        const ctor = this.constructor;
        const proto = Object.getPrototypeOf(this) as object;
        const keys = Object.keys(this);

        const columnsMetadata = keys
            .map((k) => getColumnSqlName(proto, k))
            .filter((m) => m.dbColumnName !== "");

        const values = columnsMetadata.map((col) => (this as any)[col.propertyName]);
        const columns = columnsMetadata.map((col) => col.dbColumnName);
        const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, ctor) as string;
        const query = DB.driver.getInsertQuery(tableName, columns);
        await DB.driver.execute(query, values);
    }

    static async findAll<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions?: Record<string, unknown>,
        limit?: number,
        offset?: number
    ): Promise<T[]> {
        const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
        const conditionValues = conditions ? Object.values(conditions) : [];
        const query = DB.driver.getSelectQuery(tableName, ["*"], conditions, limit, offset);
        const result = await DB.driver.execute(query, conditionValues);
        return result.map((row: any) => new this(row));
    }

    static async findOne<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions: Record<string, unknown>
    ): Promise<T | null> {
        const results = await (this as any).findAll(conditions, 1);
        return results.length > 0 ? results[0] : null;
    }

    static async findById<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        id: number
    ): Promise<T | null> {
        return await (this as any).findOne({ id });
    }

    static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions: Record<string, unknown>,
        limit?: number,
        offset?: number
    ): Promise<number> {
        const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
        const conditionValues = Object.values(conditions);
        const query = DB.driver.getDeleteQuery(tableName, conditions, limit, offset);
        const result = await DB.driver.execute(query, conditionValues);
        return result.affectedRows ?? 0;
    }

    static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions: Record<string, unknown>
    ): Promise<boolean> {
        return (await (this as any).deleteAll(conditions, 1)) > 0;
    }

    static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        id: number
    ): Promise<boolean> {
        return await (this as any).deleteOne({ id });
    }

    static async count<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions?: Record<string, unknown>
    ): Promise<number> {
        const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
        const conditionValues = conditions ? Object.values(conditions) : [];
        const query = DB.driver.getCountQuery(tableName, conditions);
        const result = await DB.driver.execute(query, conditionValues);
        return Number(result[0].count);
    }

    static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        updates: Record<string, unknown>,
        conditions: Record<string, unknown>
    ): Promise<number> {
        const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
        const query = DB.driver.getUpdateQuery(tableName, Object.keys(updates), conditions);
        const params = [...Object.values(updates), ...Object.values(conditions)];
        const result = await DB.driver.execute(query, params);
        return result.affectedRows ?? 0;
    }

    static async updateById<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        id: number,
        updates: Record<string, unknown>
    ): Promise<boolean> {
        return (await (this as any).updateAll(updates, { id })) > 0;
    }
}