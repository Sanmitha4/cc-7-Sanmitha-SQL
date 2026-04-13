import 'reflect-metadata';
export interface IBaseEntity {
    id: number;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number;
}
export declare abstract class BaseEntity implements IBaseEntity {
    id: number;
    createdAt: Date;
    createdBy: number;
    updatedAt: Date;
    updatedBy: number;
    constructor(entity: IBaseEntity);
    static getTableName(): string;
    save(): Promise<void>;
    static findById<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, id: number): Promise<T | null>;
    static findAll<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T): Promise<T[]>;
    static findOne<T extends BaseEntity, I extends IBaseEntity>(this: new (entity: I) => T, conditions: Partial<I>): Promise<T | null>;
    static deleteById(id: number): Promise<void>;
    static deleteAll(): Promise<void>;
    static deleteOne<I extends IBaseEntity>(conditions: Partial<I>): Promise<void>;
}
//# sourceMappingURL=base.entity.d.ts.map