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

export abstract class BaseEntity implements IBaseEntity {
  @Column()
  id?: number | undefined;

  @Column()
  createdAt: Date;
  @Column()
  createdBy: number;
  @Column()
  updatedAt: Date;
  @Column()
  updatedBy: number;

  // constructor(entity: IBaseEntity) {
  //     this.id = entity.id;
  //     this.createdAt = entity.createdAt;
  //     this.createdBy = entity.createdBy;
  //     this.updatedAt = entity.updatedAt;
  //     this.updatedBy = entity.updatedBy;
  // }
  constructor(entity: IBaseEntity | Record<string, any>) {
    const e = entity as any;
    this.id = e.id;

    this.createdAt = e.createdAt ?? e.createdat ?? e.created_at;
    this.createdBy = e.createdBy ?? e.createdby ?? e.created_by;
    this.updatedAt = e.updatedAt ?? e.updatedat ?? e.updated_at;
    this.updatedBy = e.updatedBy ?? e.updatedby ?? e.updated_by;
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
      .filter((metadata) => metadata.dbColumnName !== "");

    const values = columnsMetadata.map(
      (col) => (this as any)[col.propertyName],
    );
    const columns = columnsMetadata.map((col) => col.dbColumnName);
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, ctor) as string;
    const query = DB.driver.getInsertQuery(tableName, columns);
    await DB.driver.execute(query, values);
  }

  static async findAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const conditionValues = conditions ? Object.values(conditions) : [];
    const query = DB.driver.getSelectQuery(
      tableName,
      ["*"],
      conditions,
      limit,
      offset,
    );
    const result = await DB.driver.execute(query, conditionValues);
    return result.map((row: any) => new this(row));
  }

  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<T | null> {
    const results = await (this as any).findAll(conditions, 1);
    return results.length > 0 ? results[0] : null;
  }

  static async findById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<T | null> {
    return await (this as any).findOne({ id });
  }

  static async deleteAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
    limit?: number,
    offset?: number,
  ): Promise<number> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const conditionValues = Object.values(conditions);
    const query = DB.driver.getDeleteQuery(
      tableName,
      conditions,
      limit,
      offset,
    );
    const result = await DB.driver.execute(query, conditionValues);
    return result.affectedRows ?? 0;
  }

  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: Record<string, unknown>,
  ): Promise<boolean> {
    const affectedRows = await (this as any).deleteAll(conditions, 1);
    return affectedRows > 0;
  }

  static async deleteById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
  ): Promise<boolean> {
    return await (this as any).deleteOne({ id });
  }

  static async count<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions?: Record<string, unknown>,
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
    conditions: Record<string, unknown>,
  ): Promise<number> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const query = DB.driver.getUpdateQuery(
      tableName,
      Object.keys(updates),
      conditions,
    );
    const params = [...Object.values(updates), ...Object.values(conditions)];
    const result = await DB.driver.execute(query, params);
    return result.affectedRows ?? 0;
  }

  static async updateById<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    id: number,
    updates: Record<string, unknown>,
  ): Promise<boolean> {
    const affectedRows = await (this as any).updateAll(updates, { id });
    return affectedRows > 0;
  }
}
