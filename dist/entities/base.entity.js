import 'reflect-metadata';
import { TABLE_METADATA_KEY } from './table.decorator.js';
export class BaseEntity {
    id;
    createdAt;
    createdBy;
    updatedAt;
    updatedBy;
    constructor(entity) {
        this.id = entity.id;
        this.createdAt = entity.createdAt;
        this.createdBy = entity.createdBy;
        this.updatedAt = entity.updatedAt;
        this.updatedBy = entity.updatedBy;
    }
    static getTableName() {
        return Reflect.getMetadata(TABLE_METADATA_KEY, this);
    }
    async save() {
        const constructor = this.constructor;
        const tableName = constructor.getTableName();
        const keys = Object.keys(this);
        const columns = keys.join(', ');
        const values_placeholder = "?, ".repeat(keys.length).slice(0, -2);
        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values_placeholder})`;
        console.log(`\n[SQL SIMULATION] Table: ${tableName}`);
        console.log(`QUERY: ${query}`);
        console.log(`VALUES:`, Object.values(this));
    }
    static async findById(id) {
        const tableName = this.getTableName();
        console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName} WHERE id = ${id}`);
        const mockData = { id };
        return new this(mockData);
    }
    static async findAll() {
        const tableName = this.getTableName();
        console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName}`);
        return [];
    }
    static async findOne(conditions) {
        const tableName = this.getTableName();
        const whereClause = Object.keys(conditions).map(k => `${k} = ?`).join(' AND ');
        console.log(`\n[SQL SIMULATION] SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`);
        return null;
    }
    static async deleteById(id) {
        const tableName = this.getTableName();
        console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} WHERE id = ${id}`);
    }
    static async deleteAll() {
        const tableName = this.getTableName();
        console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} (TRUNCATE)`);
    }
    static async deleteOne(conditions) {
        const tableName = this.getTableName();
        const whereClause = Object.keys(conditions).map(k => `${k} = ?`).join(' AND ');
        console.log(`\n[SQL SIMULATION] DELETE FROM ${tableName} WHERE ${whereClause} LIMIT 1`);
    }
}
//# sourceMappingURL=base.entity.js.map