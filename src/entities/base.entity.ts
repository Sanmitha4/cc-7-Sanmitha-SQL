import 'reflect-metadata';
import { TABLE_METADATA_KEY } from './table.decorator.js';

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
        this.createdAt = entity.createdAt;
        this.createdBy = entity.createdBy;
        this.updatedAt = entity.updatedAt;
        this.updatedBy = entity.updatedBy;
    }
    
    static getTableName(): string {
        return Reflect.getMetadata(TABLE_METADATA_KEY, this);
    }

    async save(): Promise<void> {   
        const constructor = this.constructor as typeof BaseEntity;
        const tableName = constructor.getTableName();
        const keys = Object.keys(this);
        const columns = keys.join(', ');
        const values_placeholder = "?, ".repeat(keys.length).slice(0, -2);
        
        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values_placeholder})`;
        
        console.log(`\n[SQL SIMULATION] Table: ${tableName}`);
        console.log(`QUERY: ${query}`);
        console.log(`VALUES:`, Object.values(this));
    } 

    static async findById<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, id: number): Promise<T | null> {
        const tableName = (this as any).getTableName();
        console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName} WHERE id = ${id}`);
        
        const mockData = { id } as unknown as I; 
        return new this(mockData);
    }

    static async findAll<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T): Promise<T[]> {
        const tableName = (this as any).getTableName();
        console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName}`);
        
        return []; 
    }

    
    static async findOne<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions: Partial<I>): Promise<T | null> {
        const tableName = (this as any).getTableName();
        const whereClause = Object.keys(conditions).map(k => `${k} = ?`).join(' AND ');
        
        console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`);
        return null;
    }

    static async deleteById(id: number): Promise<void> {
        const tableName = this.getTableName();
        console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} WHERE id = ${id}`);
    }

    static async deleteAll(): Promise<void> {
        const tableName = this.getTableName();
        console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} (TRUNCATE)`);
    }

    
    static async deleteOne<I extends IBaseEntity>(conditions: Partial<I>): Promise<void> {
        const tableName = (this as any).getTableName();
        const whereClause = Object.keys(conditions).map(k => `${k} = ?`).join(' AND ');
        
        console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} WHERE ${whereClause} LIMIT 1`);
    }
}
