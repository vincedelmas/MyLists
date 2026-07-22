import {MediaListArgs} from "@/lib/schemas";
import {getDbClient} from "@/lib/server/database/async-storage";
import {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import {and, eq, inArray, isNotNull, sql, type SQL} from "drizzle-orm";


export type FilterDefinitions = Partial<Record<keyof MediaListArgs, FilterDefinition>>;
export type FilterOptionLoaders = Record<string, (userId: number) => Promise<{ name: string }[]>>;


export type FilterDefinition = {
    isActive: (args: MediaListArgs) => boolean;
    getCondition: (args: MediaListArgs) => SQL | undefined;
};


type ArrayFilterDefinition = {
    filterColumn: SQLiteColumn;
    argName: keyof MediaListArgs;
    mediaTable: SQLiteTable & { id: SQLiteColumn };
    entityTable?: SQLiteTable & { mediaId: SQLiteColumn };
    entityScope?: (args: MediaListArgs) => SQL | undefined;
};


type ListColOptionsDefinition = {
    nameColumn: SQLiteColumn;
    listTable: SQLiteTable & { userId: SQLiteColumn };
};


type MediaColOptionsDefinition = {
    nameColumn: SQLiteColumn;
    mediaTable: SQLiteTable & { id: SQLiteColumn };
    listTable: SQLiteTable & { mediaId: SQLiteColumn; userId: SQLiteColumn };
};


const isNonEmptyArray = (value: unknown): value is unknown[] => {
    return Array.isArray(value) && value.length > 0;
}


export const createArrayFilter = ({ argName, entityTable, filterColumn, mediaTable, entityScope }: ArrayFilterDefinition): FilterDefinition => {
    return ({
        isActive: (args) => isNonEmptyArray(args[argName]),
        getCondition: (args) => {
            const values = args[argName] as string[];
            if (!entityTable) return inArray(filterColumn, values);

            const subQuery = getDbClient()
                .select({ mediaId: entityTable.mediaId })
                .from(entityTable)
                .where(and(inArray(filterColumn, values), entityScope?.(args)));

            return inArray(mediaTable.id, subQuery);
        },
    });
}


export const createMediaColOptionsLoader = ({ mediaTable, listTable, nameColumn }: MediaColOptionsDefinition) => {
    return async (userId: number) => {
        return getDbClient()
            .selectDistinct({ name: sql<string>`${nameColumn}` })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), isNotNull(nameColumn)));
    }
}


export const createListColOptionsLoader = ({ listTable, nameColumn }: ListColOptionsDefinition) => {
    return async (userId: number) => {
        return getDbClient()
            .selectDistinct({ name: sql<string>`${nameColumn}` })
            .from(listTable)
            .where(and(eq(listTable.userId, userId), isNotNull(nameColumn)));
    }
}
