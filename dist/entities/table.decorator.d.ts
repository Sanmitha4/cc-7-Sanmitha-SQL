import 'reflect-metadata';
import type { BaseEntity } from './base.entity.js';
export declare const TABLE_METADATA_KEY: unique symbol;
export declare function Table<T extends typeof BaseEntity>(tableName: string): (target: T) => void;
//# sourceMappingURL=table.decorator.d.ts.map