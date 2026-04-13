// import 'reflect-metadata';
// import { TABLE_METADATA_KEY } from './table.decorator.js';

// export interface IBaseEntity {
//     id: number;
//     createdAt: Date;
//     createdBy: number;
//     updatedAt: Date;
//     updatedBy: number;
// }

// export abstract class BaseEntity implements IBaseEntity {
//     id: number;
//     createdAt: Date;
//     createdBy: number;
//     updatedAt: Date;
//     updatedBy: number;

//     constructor(entity: IBaseEntity) {
//         this.id = entity.id;
//         this.createdAt = entity.createdAt;
//         this.createdBy = entity.createdBy;
//         this.updatedAt = entity.updatedAt;
//         this.updatedBy = entity.updatedBy;
//     }
    
//     static getTableName(): string {
//         return Reflect.getMetadata(TABLE_METADATA_KEY, this);
//     }

//     async save(): Promise<void> {   
//         const constructor = this.constructor as typeof BaseEntity;
//         const tableName = constructor.getTableName();
//         const keys = Object.keys(this);
//         const columns = keys.join(', ');
//         const values_placeholder = "?, ".repeat(keys.length).slice(0, -2);
        
//         const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values_placeholder})`;
        
//         console.log(`\n[SQL SIMULATION] Table: ${tableName}`);
//         console.log(`QUERY: ${query}`);
//         console.log(`VALUES:`, Object.values(this));
//     } 

//     static async findById<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, id: number): Promise<T | null> {
//         const tableName = (this as any).getTableName();
//         console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName} WHERE id = ${id}`);
        
//         const mockData = { id } as unknown as I; 
//         return new this(mockData);
//     }

//     static async findAll<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T): Promise<T[]> {
//         const tableName = (this as any).getTableName();
//         console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName}`);
        
//         return []; 
//     }

//     static async findOne<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions: Partial<I>): Promise<T | null> {
//         const tableName = (this as any).getTableName();
//         const whereClause = Object.keys(conditions).map(k => `${k} = ?`).join(' AND ');
        
//         console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`);
//         return null;
//     }

//     static async deleteById(id: number): Promise<void> {
//         const tableName = this.getTableName();
//         console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} WHERE id = ${id}`);
//     }

//     static async deleteAll(): Promise<void> {
//         const tableName = this.getTableName();
//         console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} (TRUNCATE)`);
//     }

    
//     static async deleteOne<I extends IBaseEntity>(conditions: Partial<I>): Promise<void> {
//         const tableName = (this as any).getTableName();
//         const whereClause = Object.keys(conditions).map(k => `${k} = ?`).join(' AND ');
        
//         console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} WHERE ${whereClause} LIMIT 1`);
//     }
// }

import 'reflect-metadata';
import { TABLE_METADATA_KEY } from './table.decorator.js';
//import { db } from '../storage/db.js';

export interface IBaseEntity {
    id: number;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number;
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
    
    static getTableName(): string {
        return Reflect.getMetadata(TABLE_METADATA_KEY, this);
    }

    /**
     * INSERT / UPDATE Logic
     */
    async save(): Promise<void> {   
        const tableName = (this.constructor as typeof BaseEntity).getTableName();
        const keys = Object.keys(this);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(this);

        const updateClause = keys.map(k => `${k} = VALUES(${k})`).join(', ');
        
        const query = `
            INSERT INTO ${tableName} (${columns}) 
            VALUES (${placeholders}) 
            ON DUPLICATE KEY UPDATE ${updateClause}
        `;
        
        await db.execute(query, values);
    } 

    /**
     * SELECT by Primary Key
     */
    static async findById<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T, 
        id: number
    ): Promise<T | null> {
        const tableName = (this as any).getTableName();
        const query = `SELECT * FROM ${tableName} WHERE id = ?`;
        
        const [rows] = await db.execute(query, [id]);
        const result = (rows as I[])[0];

        return result ? new this(result) : null;
    }

    /**
     * SELECT all records
     */
    static async findAll<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T
    ): Promise<T[]> {
        const tableName = (this as any).getTableName();
        const query = `SELECT * FROM ${tableName}`;
        
        const [rows] = await db.execute(query);
        return (rows as I[]).map(data => new this(data));
    }

    /**
     * SELECT one record with dynamic WHERE clause
     */
    static async findOne<T extends BaseEntity, I extends IBaseEntity>(
        this: new (entity: I) => T, 
        conditions: Partial<I>
    ): Promise<T | null> {
        const tableName = (this as any).getTableName();
        const keys = Object.keys(conditions);
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const query = `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`;
        
        const [rows] = await db.execute(query, Object.values(conditions));
        const result = (rows as I[])[0];

        return result ? new this(result) : null;
    }

    /**
     * DELETE by Primary Key
     */
    static async deleteById(id: number): Promise<void> {
        const tableName = this.getTableName();
        const query = `DELETE FROM ${tableName} WHERE id = ?`;
        await db.execute(query, [id]);
    }

    /**
     * DELETE all records (Truncate behavior)
     */
    static async deleteAll(): Promise<void> {
        const tableName = this.getTableName();
        const query = `DELETE FROM ${tableName}`;
        await db.execute(query);
    }

    /**
     * DELETE with dynamic WHERE clause
     */
    static async deleteOne<I extends IBaseEntity>(conditions: Partial<I>): Promise<void> {
        const tableName = (this as any).getTableName();
        const keys = Object.keys(conditions);
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const query = `DELETE FROM ${tableName} WHERE ${whereClause} LIMIT 1`;
        
        await db.execute(query, Object.values(conditions));
    }
}