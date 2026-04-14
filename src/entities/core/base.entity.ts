

import 'reflect-metadata';
import { TABLE_METADATA_KEY } from '../table.decorator.js';
import { DB } from './db.js';
import { Column } from './column.decorator.js';

export interface IBaseEntity {
    id?: number|undefined;
    @Column()
    createdAt: Date;
    @Column()
    createdBy: number;
    @Column()
    updatedAt: Date;
    @Column()
    updatedBy: number;
}

export interface IPagination {
    limit?: number;
    offset?: number;
}

export abstract class BaseEntity implements IBaseEntity {
    id: number;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number;

    constructor(entity: IBaseEntity) {
        this.id = entity.id;
        this.createdAt = entity.createdAt || new Date();
        this.createdBy = entity.createdBy;
        this.updatedAt = entity.updatedAt || new Date();
        this.updatedBy = entity.updatedBy;
    }


    private static buildWhere(conditions?: Record<string, any>): { sql: string; values: any[] } {
        if (!conditions || Object.keys(conditions).length === 0) return { sql: '', values: [] };
        const keys = Object.keys(conditions);
        return {
            sql: ` WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}`,
            values: Object.values(conditions)
        };
    }

    private static buildLimit(limit?: number, offset?: number): { sql: string; values: any[] } {
        let sql = '';
        const values: number[] = [];
        if (limit !== undefined) {
            sql += ` LIMIT ?`;
            values.push(limit);
            if (offset !== undefined) {
                sql += ` OFFSET ?`;
                values.push(offset);
            }
        }
        return { sql, values };
    }

    static getTableName(): string {
        return Reflect.getMetadata(TABLE_METADATA_KEY, this);
    }

    async save(): Promise<void> {
        const tableName = (this.constructor as typeof BaseEntity).getTableName();
        const keys = Object.keys(this);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const updateClause = keys.map(k => `${k} = VALUES(${k})`).join(', ');

        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
        await db.execute(query, Object.values(this));
    }

    static async findAll<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions?: Partial<I>,
        pagination?: IPagination
    ): Promise<T[]> {
        const table = (this as any).getTableName();
        const { sql: where, values: wVals } = (this as any).buildWhere(conditions);
        const { sql: limit, values: lVals } = (this as any).buildLimit(pagination?.limit, pagination?.offset);

        const rows = await db.execute(`SELECT * FROM ${table}${where}${limit}`, [...wVals, ...lVals]) as I[];
        return rows.map(data => new this(data));
    }
    static async findOne<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T,
        conditions: Partial<I>
    ): Promise<T | null> {
        const { sql: where, values } = (this as any).buildWhere(conditions);
        const query = `SELECT * FROM ${(this as any).getTableName()}${where} LIMIT 1`;
        
        const rows = await db.execute(query, values) as I[];
        return rows[0] ? new this(rows[0]) : null;
    }

    static async deleteById(id: number): Promise<number> {
        const result: any = await db.execute(`DELETE FROM ${this.getTableName()} WHERE id = ?`, [id]);
        return result.affectedRows || 0;
    }

    static async deleteOne<I extends IBaseEntity>(conditions: Partial<I>): Promise<number> {
        const { sql: where, values } = (this as any).buildWhere(conditions);
        const query = `DELETE FROM ${(this as any).getTableName()}${where} LIMIT 1`;
        
        const result: any = await db.execute(query, values);
        return result.affectedRows || 0;
    }

    static async deleteAll<I extends IBaseEntity>(conditions?: Partial<I>, limit?: number): Promise<number> {
        const { sql: where, values: wVals } = (this as any).buildWhere(conditions);
        const { sql: lim, values: lVals } = (this as any).buildLimit(limit);

        const query = `DELETE FROM ${this.getTableName()}${where}${lim}`;
        const result: any = await db.execute(query, [...wVals, ...lVals]);
        return result.affectedRows || 0;
    }
}

async save(): Promise<void> {
    const tableName = (this.constructor as typeof BaseEntity).getTableName();
    
    // Get white-listed properties from the @Column decorator
    const whiteListedColumns: string[] = Reflect.getMetadata(COLUMN_METADATA_KEY, this) || [];
    
    // Also include base columns (id, createdAt, etc.)
    const baseColumns = ['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'];
    const allColumns = [...baseColumns, ...whiteListedColumns];

    // Build values only from white-listed keys
    const values = allColumns.map(key => (this as any)[key]);
    
    // Use the driver to get the query (Clean Separation of Concerns)
    const query = DB.driver.getInsertQuery(tableName, allColumns);
    
    // Add ON DUPLICATE KEY logic if needed, or handle via driver
    await DB.driver.execute(query, values);
}