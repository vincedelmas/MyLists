import {type GetColumnData, sql} from "drizzle-orm";
import type {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";


// Aggregate each relation separately so unrelated child tables never multiply rows
export const mediaRelationArray = <TFields extends Record<string, SQLiteColumn>>(
    table: SQLiteTable & { mediaId: SQLiteColumn },
    mediaId: SQLiteColumn,
    fields: TFields,
    orderBy: SQLiteColumn,
) => {
    const entries = Object.entries(fields).flatMap(([key, column]) => [sql`${key}`, sql`${column}`]);

    // Drizzle strips col qualifiers in single-table selections, keep outer ref explicit
    return sql`(
        SELECT json_group_array(json_object(${sql.join(entries, sql`, `)}) ORDER BY ${orderBy})
        FROM ${table}
        WHERE ${table.mediaId} = ${mediaId.table}.${sql.identifier(mediaId.name)}
    )`.mapWith((value: string): { [K in keyof TFields]: GetColumnData<TFields[K]> }[] => JSON.parse(value));
};
