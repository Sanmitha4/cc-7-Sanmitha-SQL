// import 'reflect-metadata';

// // A unique key to identify our metadata
// export const COLUMN_METADATA_KEY = Symbol('column');

// export function Column() {
//     return function(target: any, propertyKey: string) {
//         /**
//          * 'target' is the class prototype.
//          * 'propertyKey' is the name of the variable (e.g., "email").
//          */

//         // 1. Get the existing list of columns already stored, or start a new array
//         const columns: string[] = Reflect.getMetadata(COLUMN_METADATA_KEY, target) || [];

//         // 2. Add the current property name to that list
//         columns.push(propertyKey);

//         // 3. Save the updated list back into the metadata
//         Reflect.defineMetadata(COLUMN_METADATA_KEY, columns, target);
//     };
// }
import "reflect-metadata";

export const COLUMN_METADATA_KEY = Symbol("column");
export interface ColumnOptions {
    name?: string;
}

function normalizeOptions(options?: string | ColumnOptions): ColumnOptions {
    if (options === undefined) {
        return {};
    }
    if (typeof options === "string") {
        return { name: options };
    }
    return options;
}

export function Column(options?: string | ColumnOptions) {
    const resolved = normalizeOptions(options);
    return function (target: object, propertyKey: string | symbol): void {
        Reflect.defineMetadata(COLUMN_METADATA_KEY, resolved, target, propertyKey);
    };
}

export function getColumnSqlName(prototype: object, propertyKey: string): { dbColumnName: string, propertyName: string } {
    const meta = Reflect.getMetadata(COLUMN_METADATA_KEY, prototype, propertyKey) as
        | ColumnOptions
        | undefined;

    return { dbColumnName: meta ? meta.name ?? propertyKey : '', propertyName: propertyKey };
}