import { z } from 'zod/v4';
export declare const unitTypeSelectSchema: import("drizzle-zod").BuildSchema<"select", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "contentType";
        dataType: "number";
        columnType: "SQLiteInteger";
        data: number;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "type";
        tableName: "contentType";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
}, undefined, undefined>;
export declare const unitTypeInsertSchema: import("drizzle-zod").BuildSchema<"insert", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "contentType";
        dataType: "number";
        columnType: "SQLiteInteger";
        data: number;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "type";
        tableName: "contentType";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
}, undefined, undefined>;
export declare const unitTypeUpdateSchema: import("drizzle-zod").BuildSchema<"update", {
    id: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "id";
        tableName: "contentType";
        dataType: "number";
        columnType: "SQLiteInteger";
        data: number;
        driverParam: number;
        notNull: true;
        hasDefault: true;
        isPrimaryKey: true;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: undefined;
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {}>;
    type: import("drizzle-orm/sqlite-core").SQLiteColumn<{
        name: "type";
        tableName: "contentType";
        dataType: "string";
        columnType: "SQLiteText";
        data: string;
        driverParam: string;
        notNull: true;
        hasDefault: false;
        isPrimaryKey: false;
        isAutoincrement: false;
        hasRuntimeDefault: false;
        enumValues: [string, ...string[]];
        baseColumn: never;
        identity: undefined;
        generated: undefined;
    }, {}, {
        length: number | undefined;
    }>;
}, undefined, undefined>;
export type UnitType = z.infer<typeof unitTypeSelectSchema>;
export type CreateUnitTypeInput = z.infer<typeof unitTypeInsertSchema>;
export type UpdateUnitTypeInput = z.infer<typeof unitTypeUpdateSchema>;
//# sourceMappingURL=unit-types.d.ts.map