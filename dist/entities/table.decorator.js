import 'reflect-metadata';
export const TABLE_METADATA_KEY = Symbol('table');
export function Table(tableName) {
    return function (target) {
        Reflect.defineMetadata(TABLE_METADATA_KEY, tableName, target);
    };
}
//# sourceMappingURL=table.decorator.js.map