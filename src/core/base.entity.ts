import "reflect-metadata";
import { DB } from "./db.js";
import { Column, getColumnSqlName } from "./column.decorator.js";
import { TABLE_METADATA_KEY } from "./table.decorator.js";
import type { FilterCondition, WhereCondition } from "./query.types.js";

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

type GroupCondition = { AND?: WhereCondition[]; OR?: WhereCondition[] };

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

  private static mapPropertyToColumnName(
    this: typeof BaseEntity,
    propertyName: string,
  ): string {
    const metadata = getColumnSqlName(this.prototype, propertyName);
    return metadata.dbColumnName !== "" ? metadata.dbColumnName : propertyName;
  }

  private static isGroupCondition(condition: WhereCondition): condition is GroupCondition {
    return (
      typeof condition === "object" &&
      condition !== null &&
      ("AND" in condition || "OR" in condition)
    );
  }

  private static isFilterCondition(
    condition: WhereCondition,
  ): condition is FilterCondition {
    return (
      typeof condition === "object" &&
      condition !== null &&
      "field" in condition &&
      "value" in condition
    );
  }

  private static mapConditionsToColumns(
    this: typeof BaseEntity,
    conditions?: WhereCondition,
  ): WhereCondition | undefined {
    if (!conditions) return undefined;

    if ((this as typeof BaseEntity).isGroupCondition(conditions)) {
      return {
        ...(conditions.AND
          ? {
              AND: conditions.AND.map((item) =>
                (this as typeof BaseEntity).mapConditionsToColumns(item),
              ).filter((item): item is WhereCondition => item !== undefined),
            }
          : {}),
        ...(conditions.OR
          ? {
              OR: conditions.OR.map((item) =>
                (this as typeof BaseEntity).mapConditionsToColumns(item),
              ).filter((item): item is WhereCondition => item !== undefined),
            }
          : {}),
      };
    }

    if ((this as typeof BaseEntity).isFilterCondition(conditions)) {
      return {
        ...conditions,
        field: (this as typeof BaseEntity).mapPropertyToColumnName(
          conditions.field,
        ),
      };
    }

    const mappedEntries = Object.entries(conditions as Record<string, unknown>).map(
      ([propertyName, value]) => [
        (this as typeof BaseEntity).mapPropertyToColumnName(propertyName),
        value,
      ],
    );

    return Object.fromEntries(mappedEntries);
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
    conditions?: WhereCondition,
    limit?: number,
    offset?: number,
  ): Promise<T[]> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const mappedConditions = (this as unknown as typeof BaseEntity).mapConditionsToColumns(conditions);
    const selectQuery = DB.driver.getSelectQuery(
      tableName,
      ["*"],
      mappedConditions,
      limit,
      offset,
    );
    const result = await DB.driver.execute(selectQuery.query, selectQuery.params as any[]);
    return result.map((row: any) => new this(row));
  }

  static async findOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: WhereCondition,
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
    conditions: WhereCondition,
    limit?: number,
    offset?: number,
  ): Promise<number> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const mappedConditions = (this as unknown as typeof BaseEntity).mapConditionsToColumns(conditions)!;
    const deleteQuery = DB.driver.getDeleteQuery(
      tableName,
      mappedConditions,
      limit,
      offset,
    );
    const result = await DB.driver.execute(deleteQuery.query, deleteQuery.params as any[]);
    return result.affectedRows ?? 0;
  }

  static async deleteOne<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    conditions: WhereCondition,
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
    conditions?: WhereCondition,
  ): Promise<number> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const mappedConditions = (this as unknown as typeof BaseEntity).mapConditionsToColumns(conditions);
    const countQuery = DB.driver.getCountQuery(tableName, mappedConditions);
    const result = await DB.driver.execute(countQuery.query, countQuery.params as any[]);
    return Number(result[0].count);
  }

  static async updateAll<T extends BaseEntity, I extends IBaseEntity>(
    this: new (entity: I) => T,
    updates: Record<string, unknown>,
    conditions: WhereCondition,
  ): Promise<number> {
    const tableName = Reflect.getMetadata(TABLE_METADATA_KEY, this) as string;
    const mappedUpdates = Object.fromEntries(
      Object.entries(updates).map(([propertyName, value]) => [
        (this as unknown as typeof BaseEntity).mapPropertyToColumnName(propertyName),
        value,
      ]),
    );
    const mappedConditions = (this as unknown as typeof BaseEntity).mapConditionsToColumns(conditions)!;
    const updateQuery = DB.driver.getUpdateQuery(
      tableName,
      Object.keys(mappedUpdates),
      mappedConditions,
    );
    const params = [...Object.values(mappedUpdates), ...updateQuery.params];
    const result = await DB.driver.execute(updateQuery.query, params);
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
