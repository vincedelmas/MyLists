import type {ScopedMediaFilterValues} from "@/lib/schemas/media-filters.schema";
import type {Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import type {NameObj} from "@/lib/types/media-common.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import type {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {and, eq, gte, inArray, isNotNull, like, or, type SQL, sql} from "drizzle-orm";
import type {AnyMediaRepositoryDefinition, BaseMediaTables} from "@/lib/media-definitions/base/media.definition.server";
import type {MediaCommonFilters, MediaMetadataFilterKey, MediaMetadataFilters} from "@/lib/media-definitions/definition.registry";


type MediaFilterOptionsScope = { mediaIds: SQL; userId?: number };
type MediaFilterSource = Omit<ArrayFilterDefinition, "argName" | "mediaTable">;
type MediaCommonFilterArgs = Omit<MediaCommonFilters, "status"> & { status?: Status[] };
type MediaFilterArgs = MediaCommonFilterArgs & MediaMetadataFilters & { userId?: number };


type FilterDefinition = {
    personal?: boolean;
    isActive: (args: MediaFilterArgs) => boolean;
    getCondition: (args: MediaFilterArgs) => SQL;
    getOptions?: (scope: MediaFilterOptionsScope) => NameObj[];
};


type ArrayFilterDefinition = {
    splitValues?: boolean;
    filterColumn: SQLiteColumn;
    argName: keyof MediaFilterArgs;
    mediaTable: SQLiteTable & { id: SQLiteColumn };
    entityTable?: SQLiteTable & { mediaId: SQLiteColumn };
    entityScope?: (args: MediaFilterArgs) => SQL | undefined;
    optionsTable?: SQLiteTable & { mediaId: SQLiteColumn; userId: SQLiteColumn };
};


export type MediaFilterDefinitions = {
    common: Partial<Record<keyof MediaCommonFilters, FilterDefinition>>;
    metadata: Partial<Record<MediaMetadataFilterKey, FilterDefinition>>;
};


export const getMediaNameSearchCondition = (mediaTable: BaseMediaTables["mediaTable"], query: string) => {
    const pattern = `%${query}%`;
    const nameCondition = like(mediaTable.name, pattern);

    return mediaTable.originalName
        ? or(nameCondition, like(mediaTable.originalName, pattern))!
        : nameCondition;
};


const createArrayFilter = ({ argName, entityTable, filterColumn, mediaTable, entityScope, optionsTable, splitValues }: ArrayFilterDefinition): FilterDefinition => {
    return {
        personal: optionsTable !== undefined,

        isActive: (args) => {
            return Array.isArray(args[argName]) && args[argName].length > 0;
        },

        getCondition: (args) => {
            const values = args[argName] as string[];
            if (splitValues) {
                return sql`EXISTS (
                    SELECT 1 FROM JSON_EACH('[' || REPLACE(JSON_QUOTE(${filterColumn}), ',', '","') || ']')
                    WHERE TRIM(value) IN (${sql.join(values.map(value => sql`${value}`), sql`, `)})
                )`;
            }

            if (!entityTable) {
                return inArray(filterColumn, values);
            }

            const subQuery = getDbClient()
                .select({ mediaId: entityTable.mediaId })
                .from(entityTable)
                .where(and(inArray(filterColumn, values), entityScope?.(args)));

            return inArray(mediaTable.id, subQuery);
        },

        getOptions: ({ mediaIds, userId }) => {
            const table = entityTable ?? optionsTable ?? mediaTable;
            const mediaIdColumn = entityTable?.mediaId ?? optionsTable?.mediaId ?? mediaTable.id;

            const rows = getDbClient()
                .selectDistinct({ name: sql<string>`${filterColumn}` })
                .from(table)
                .where(and(
                    sql`${mediaIdColumn} IN (${mediaIds})`, isNotNull(filterColumn),
                    optionsTable ? eq(optionsTable.userId, userId!) : undefined,
                )).all();

            const names = rows.flatMap(row => splitValues ? row.name.split(",").map(name => name.trim()) : [row.name]);

            return [...new Set(names.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map(name => ({ name }));
        },
    };
};


export const defineMediaFilterDefinitions = <const TDef extends Pick<MediaDefinition, "filters">>(
    definition: TDef,
    { mediaTable, listTable, tagTable, genreTable }: Pick<BaseMediaTables, "mediaTable" | "listTable" | "tagTable" | "genreTable">,
    metadata: Readonly<Record<NoInfer<Extract<keyof TDef["filters"]["metadata"], string>>, MediaFilterSource>>,
) => {
    const commonFilters = {
        search: {
            isActive: (args) => !!args.search,
            getCondition: (args) => getMediaNameSearchCondition(mediaTable, args.search!),
        },
        status: {
            ...createArrayFilter({
                mediaTable,
                argName: "status",
                filterColumn: listTable.status,
            }),
            personal: true,
        },
        favorite: {
            personal: true,
            isActive: (args) => args.favorite !== undefined,
            getCondition: (args) => sql`COALESCE(${listTable.favorite}, 0) = ${Number(args.favorite)}`,
        },
        comment: {
            personal: true,
            getCondition: () => isNotNull(listTable.comment),
            isActive: (args) => args.comment === true,
        },
        minRating: {
            personal: true,
            isActive: (args) => args.minRating !== undefined,
            getCondition: (args) => gte(listTable.rating, args.minRating!),
        },
        tags: {
            ...createArrayFilter({
                mediaTable,
                argName: "tags",
                entityTable: tagTable,
                filterColumn: tagTable.name,
                entityScope: (args) => eq(tagTable.userId, args.userId!),
            }),
            personal: true,
        },
        genres: createArrayFilter({
            mediaTable,
            argName: "genres",
            entityTable: genreTable,
            filterColumn: genreTable.name,
        }),
    } satisfies Record<keyof MediaCommonFilters, FilterDefinition>;

    return {
        common: Object.fromEntries(Object.keys(definition.filters.common).map(key => [
            key, commonFilters[key as keyof MediaCommonFilters],
        ])) as Record<Extract<keyof TDef["filters"]["common"], string>, FilterDefinition>,

        metadata: Object.fromEntries(Object.keys(definition.filters.metadata).map(argName => [
            argName,
            createArrayFilter({
                ...metadata[argName as Extract<keyof TDef["filters"]["metadata"], string>],
                mediaTable,
                argName: argName as keyof MediaFilterArgs,
            }),
        ])) as Record<Extract<keyof TDef["filters"]["metadata"], string>, FilterDefinition>,
    };
};


const getMediaFilterConditions = (definitions: Readonly<Record<string, FilterDefinition>>, args: MediaFilterArgs) => {
    const conditions: SQL[] = [];

    for (const filter of Object.values(definitions)) {
        if (!filter.isActive(args)) continue;

        if (filter.personal && args.userId === undefined) {
            throw new FormattedError("Sign in to filter by your own list.");
        }

        conditions.push(filter.getCondition(args));
    }

    return conditions;
};


export const getMediaCommonFilterConditions = (definition: AnyMediaRepositoryDefinition, filters: MediaCommonFilterArgs, userId?: number) => {
    return getMediaFilterConditions(definition.filters.common, { ...filters, userId });
};


export const getMediaMetadataFilterConditions = (definition: AnyMediaRepositoryDefinition, filters: MediaMetadataFilters = {}, userId?: number) => {
    return getMediaFilterConditions(definition.filters.metadata, { ...filters, userId });
};


export const getMediaMetadataFilterOptions = (definition: AnyMediaRepositoryDefinition, scope: MediaFilterOptionsScope) => {
    const options: Partial<Record<MediaMetadataFilterKey, NameObj[]>> = {};

    for (const [key, filter] of Object.entries(definition.filters.metadata)) {
        if (filter.getOptions && (!filter.personal || scope.userId !== undefined)) {
            options[key as MediaMetadataFilterKey] = filter.getOptions(scope);
        }
    }

    return options;
};


export const getMediaScopedFilterConditions = (definition: AnyMediaRepositoryDefinition, filters: ScopedMediaFilterValues = {}, userId?: number) => {
    const conditions = [
        ...getMediaCommonFilterConditions(definition, { genres: filters.genres }, userId),
        ...getMediaMetadataFilterConditions(definition, filters, userId),
    ];
    if (!definition.filters.common.tags || (!filters.tags?.length && !filters.excludeTags?.length)) return conditions;
    if (userId === undefined) throw new FormattedError("Sign in to filter by your own list.");

    const { tagTable, mediaTable, listTable } = definition.tables;
    conditions.push(isNotNull(listTable.userId));
    if (filters.tags?.length) {
        const tags = [...new Set(filters.tags)];
        const matching = sql`SELECT DISTINCT ${tagTable.name} FROM ${tagTable}
            WHERE ${tagTable.userId} = ${userId} AND ${tagTable.mediaId} = ${mediaTable.id}
                AND ${tagTable.name} IN (${sql.join(tags.map(tag => sql`${tag}`), sql`, `)})`;
        conditions.push(filters.tagsMatch === "all"
            ? sql`(SELECT COUNT(*) FROM (${matching})) = ${tags.length}`
            : sql`EXISTS (${matching})`);
    }
    if (filters.excludeTags?.length) {
        conditions.push(sql`NOT EXISTS (SELECT 1 FROM ${tagTable}
            WHERE ${tagTable.userId} = ${userId} AND ${tagTable.mediaId} = ${mediaTable.id}
                AND ${tagTable.name} IN (${sql.join(filters.excludeTags.map(tag => sql`${tag}`), sql`, `)}))`);
    }
    return conditions;
};
