import 'reflect-metadata';

export const COLUMN_METADATA_KEY = Symbol('column');

export function Column() {
    return function(target: any, propertyKey: string) {
        // Get existing columns or initialize a new array
        const columns: string[] = Reflect.getMetadata(COLUMN_METADATA_KEY, target) || [];
        columns.push(propertyKey);
        // Store the list of white-listed columns on the class prototype
        Reflect.defineMetadata(COLUMN_METADATA_KEY, columns, target);
    };
}