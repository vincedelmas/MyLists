import {MediaType, Status} from "@/lib/utils/enums";
import {and, eq, inArray, notInArray, sql} from "drizzle-orm";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {MediaListData, ScopedMediaFilterOptions} from "@/lib/types/media-list.types";
import type {DynamicListRuntimeFilters, DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {user, userMediaSettings} from "@/lib/server/database/schema";
import {FormattedError} from "@/lib/utils/error-classes";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {getMediaListSelection} from "@/lib/server/domain/media/base/media-list.queries";
import {getMediaCommonFilterConditions, getMediaMetadataFilterConditions, getMediaMetadataFilterOptions} from "@/lib/server/domain/media/base/media-filters.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {animeList, booksList, gamesList, mangaList, moviesList, seriesList} from "@/lib/server/database/schema";


type DynamicListListItem = MediaListData<
    typeof animeList.$inferSelect
    | typeof booksList.$inferSelect
    | typeof gamesList.$inferSelect
    | typeof mangaList.$inferSelect
    | typeof moviesList.$inferSelect
    | typeof seriesList.$inferSelect
>["items"][number];


type DynamicListItem = DynamicListListItem & {
    title: string;
    mediaType: MediaType;
    providerRating: number | null;
    releaseDate: string | null;
};


const statusGroups = {
    on_hold: [Status.ON_HOLD],
    dropped: [Status.DROPPED],
    completed: [Status.COMPLETED],
    in_progress: [Status.WATCHING, Status.READING, Status.PLAYING],
    planned: [Status.PLAN_TO_WATCH, Status.PLAN_TO_READ, Status.PLAN_TO_PLAY],
} satisfies Record<NonNullable<DynamicListSpec["filters"]["statusGroup"]>, Status[]>;


type DynamicListQueryOptions = {
    now?: Date;
    page?: number;
    viewerId?: number;
    includeFilterOptions?: boolean;
    filters?: DynamicListRuntimeFilters;
};


const getDynamicListResultPage = (userId: number, spec: DynamicListSpec, {
    page = 1,
    viewerId,
    perPage = 24,
    now = new Date(),
    filters: runtimeFilters,
    includeFilterOptions = false,
}: DynamicListQueryOptions & { perPage?: number } = {}) => {
    const { filters } = spec;
    const browseFilters = runtimeFilters ?? {};

    const mediaTypes = spec.mediaTypes === "all" ? ALL_MEDIA_TYPES : spec.mediaTypes;
    const cutoffs: Partial<Record<"addedBefore" | "addedWithin" | "updatedBefore", string>> = {};

    if (browseFilters.hideCommon && viewerId === undefined) {
        throw new FormattedError("Sign in to hide media in your own list.");
    }

    let sortKey = browseFilters.sorting && browseFilters.sorting !== "default"
        ? browseFilters.sorting
        : undefined;

    for (const filter of ["addedBefore", "addedWithin", "updatedBefore"] as const) {
        const relativeAge = filters[filter];
        if (!relativeAge) continue;

        const date = new Date(now);
        const day = date.getUTCDate();

        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() - relativeAge.monthsAgo);

        const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        date.setUTCDate(Math.min(day, monthEnd));

        cutoffs[filter] = date.toISOString();
    }

    const sources = mediaTypes.map(mediaType => {
        const allowedStatuses = getMediaDefinition(mediaType).statuses;
        const definition = getServerMediaDefinition(mediaType).repository;
        const { tables: { mediaTable, listTable, tagTable, genreTable }, sortColumns } = definition;

        const conditions = [sql`${listTable.userId} = ${userId}`, sql`${userMediaSettings.active} = 1`];
        conditions.push(
            ...getMediaCommonFilterConditions(definition, {
                minRating: filters.minRating, favorite: filters.favorite, genres: filters.genres,
            }, userId),
            ...getMediaMetadataFilterConditions(definition, filters.mediaFilters?.[mediaType], userId),
        );

        if (definition.filters.common.search && filters.search) {
            conditions.push(sql`INSTR(LOWER(${mediaTable.name}), LOWER(${filters.search})) > 0`);
        }

        if (definition.filters.common.status && filters.statusGroup) {
            const statuses = statusGroups[filters.statusGroup].filter(s => allowedStatuses.includes(s));
            conditions.push(statuses.length
                ? sql`${listTable.status} IN (${sql.join(statuses.map(status => sql`${status}`), sql`, `)})`
                : sql`0`);
        }

        if (definition.filters.common.status && filters.statuses) {
            const statuses = filters.statuses.filter(s => allowedStatuses.includes(s));
            conditions.push(statuses.length
                ? sql`${listTable.status} IN (${sql.join(statuses.map(status => sql`${status}`), sql`, `)})`
                : sql`0`);
        }

        if (cutoffs.addedBefore) {
            conditions.push(sql`JULIANDAY(${listTable.addedAt}) < JULIANDAY(${cutoffs.addedBefore})`);
        }

        if (cutoffs.addedWithin) {
            conditions.push(sql`JULIANDAY(${listTable.addedAt}) >= JULIANDAY(${cutoffs.addedWithin})`);
        }

        if (cutoffs.updatedBefore) {
            conditions.push(sql`JULIANDAY(${listTable.lastUpdated}) < JULIANDAY(${cutoffs.updatedBefore})`);
        }

        if (definition.filters.common.minRating && filters.maxRating !== undefined) {
            conditions.push(sql`${listTable.rating} <= ${filters.maxRating}`);
        }

        if (definition.filters.common.minRating && filters.rated !== undefined) {
            conditions.push(filters.rated ? sql`${listTable.rating} IS NOT NULL` : sql`${listTable.rating} IS NULL`);
        }

        if (definition.filters.common.comment && filters.hasComment !== undefined) {
            conditions.push(filters.hasComment
                ? sql`LENGTH(TRIM(COALESCE(${listTable.comment}, ''))) > 0`
                : sql`LENGTH(TRIM(COALESCE(${listTable.comment}, ''))) = 0`);
        }

        const releaseYear = sql`CAST(STRFTIME('%Y', ${mediaTable.releaseDate}) AS INTEGER)`;

        if (filters.minReleaseYear !== undefined) {
            conditions.push(sql`${releaseYear} >= ${filters.minReleaseYear}`);
        }

        if (filters.maxReleaseYear !== undefined) {
            conditions.push(sql`${releaseYear} <= ${filters.maxReleaseYear}`);
        }

        if (definition.filters.common.tags && filters.tags) {
            const tags = [...new Set(filters.tags)];

            const matchingTags = sql`
                SELECT ${tagTable.name} 
                FROM ${tagTable}
                WHERE ${tagTable.userId} = ${userId} 
                    AND ${tagTable.mediaId} = ${listTable.mediaId}
                    AND ${tagTable.name} IN (${sql.join(tags.map(tag => sql`${tag}`), sql`, `)})`;

            conditions.push(filters.tagsMatch === "all"
                ? sql`(SELECT COUNT(*) FROM (${matchingTags})) = ${tags.length}`
                : sql`EXISTS (${matchingTags})`);
        }

        if (definition.filters.common.tags && filters.excludeTags) {
            conditions.push(sql`NOT EXISTS (
                SELECT 1 FROM ${tagTable}
                WHERE ${tagTable.userId} = ${userId} AND ${tagTable.mediaId} = ${listTable.mediaId}
                    AND ${tagTable.name} IN (${sql.join(filters.excludeTags.map(tag => sql`${tag}`), sql`, `)})
            )`);
        }

        const selection = sql`
            ${mediaType} AS "mediaType", 
            ${mediaTable.name} AS "title",
            ${listTable.mediaId} AS "mediaId", 
            ${mediaTable.releaseDate} AS "releaseDate",
            COALESCE(${listTable.customCover}, ${mediaTable.imageCover}) AS "imageCover"`;

        const from = sql`FROM ${listTable}
            INNER JOIN ${mediaTable} ON ${mediaTable.id} = ${listTable.mediaId}
            INNER JOIN ${userMediaSettings} ON ${userMediaSettings.userId} = ${listTable.userId}
                AND ${userMediaSettings.mediaType} = ${mediaType}
            WHERE ${sql.join(conditions, sql` AND `)}`;

        const baseQuery = sql`SELECT ${selection} ${from}`;

        const browseConditions = [
            ...getMediaCommonFilterConditions(definition, {
                ...browseFilters, search: undefined,
                status: browseFilters.status ? [browseFilters.status] : undefined,
                favorite: browseFilters.favorite === true ? true : undefined,
            }, userId),
            ...getMediaMetadataFilterConditions(definition, browseFilters.mediaFilters?.[mediaType], userId),
        ];

        if (browseFilters.hideCommon && viewerId !== userId) {
            browseConditions.push(notInArray(listTable.mediaId, getDbClient()
                .select({ mediaId: listTable.mediaId }).from(listTable).where(eq(listTable.userId, viewerId!))));
        }

        if (browseFilters.mediaType && browseFilters.mediaType !== mediaType) {
            browseConditions.push(sql`0`);
        }

        if (definition.filters.common.search && browseFilters.search) {
            browseConditions.push(sql`INSTR(LOWER(${mediaTable.name}), LOWER(${browseFilters.search})) > 0`);
        }

        if (browseFilters.library === "out") {
            browseConditions.push(sql`0`);
        }

        return {
            mediaType,
            definition,
            selection,
            sortColumns,
            baseQuery,
            from: browseConditions.length
                ? sql`${from} AND ${sql.join(browseConditions, sql` AND `)}`
                : from,

            genreQuery: definition.filters.common.genres ? sql`SELECT ${genreTable.name} AS "name" 
                FROM ${genreTable}
                WHERE ${genreTable.mediaId} IN (SELECT "mediaId" FROM (${baseQuery}))` : sql`SELECT NULL AS "name" WHERE 0`,

            tagQuery: definition.filters.common.tags ? sql`SELECT ${tagTable.name} AS "name" 
                FROM ${tagTable}
                WHERE ${tagTable.userId} = ${userId} 
                    AND ${tagTable.mediaId} IN (SELECT "mediaId" FROM (${baseQuery}))` : sql`SELECT NULL AS "name" WHERE 0`,
        };
    });

    const db = getDbClient();
    const availableMediaTypes = db.all<{ mediaType: MediaType }>(sql`
        SELECT DISTINCT "mediaType" 
        FROM (${sql.join(sources.map(source => source.baseQuery), sql` UNION ALL `)})
    `).map(row => row.mediaType);

    const sortMediaTypes = browseFilters.mediaType && mediaTypes.includes(browseFilters.mediaType)
        ? [browseFilters.mediaType]
        : availableMediaTypes.length ? availableMediaTypes : mediaTypes;

    if (sortKey && !getMediaSortOptions(sortMediaTypes, true).some(opt => opt.value === sortKey)) {
        sortKey = undefined;
    }

    const sort = sortKey ? MEDIA_SORT_DEFINITIONS[sortKey] : spec.sort;
    const union = sql.join(sources.map(source => sql`
        SELECT ${source.selection}, ${source.sortColumns[sort.field] ?? sql`NULL`} AS "sortValue"
        ${source.from}
    `), sql` UNION ALL `);

    const direction = sort.direction === "asc" ? sql`ASC` : sql`DESC`;
    const [{ total }] = db.all<{ total: number }>(sql`SELECT COUNT(*) AS "total" FROM (${union})`);

    // Preserve nullable response fields; each media's list projection fills the applicable values.
    const rows = db.all<{ mediaType: MediaType; mediaId: number; title: string; imageCover: string; releaseDate: string | null }>(sql`
        SELECT "mediaType", "mediaId", "title", "imageCover", "releaseDate",
            NULL AS "redo", NULL AS "pages", NULL AS "chapters", NULL AS "playtime"
        FROM (${union}) 
        ORDER BY "sortValue" ${direction} NULLS LAST, "title" COLLATE NOCASE ASC, "mediaType" ASC, "mediaId" ASC
        LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`);

    const filterOptions: { genres: string[]; tags: string[]; mediaFilters: ScopedMediaFilterOptions } = {
        genres: [], tags: [], mediaFilters: {},
    };

    if (runtimeFilters || includeFilterOptions) {
        if (includeFilterOptions) {
            for (const source of sources) {
                filterOptions.mediaFilters[source.mediaType] = getMediaMetadataFilterOptions(source.definition, {
                    userId, mediaIds: sql`SELECT "mediaId" FROM (${source.baseQuery})`,
                });
            }
        }
        const tags = sql.join(sources.map(s => s.tagQuery), sql` UNION ALL `);
        const genres = sql.join(sources.map(s => s.genreQuery), sql` UNION ALL `);

        filterOptions.genres = db.all<{ name: string }>(sql`
            SELECT DISTINCT "name" 
            FROM (${genres}) 
            ORDER BY "name" COLLATE NOCASE
        `).map(row => row.name);

        filterOptions.tags = db.all<{ name: string }>(sql`
          SELECT DISTINCT "name" 
          FROM (${tags}) 
          ORDER BY "name" COLLATE NOCASE
        `).map(row => row.name);
    }

    return {
        page,
        total,
        perPage,
        items: rows,
        filterOptions,
        sorting: sortKey ?? "default",
        mediaTypes: availableMediaTypes,
        pages: Math.ceil(total / perPage),
    };
};


export const getDynamicListResults = (userId: number, spec: DynamicListSpec, options: DynamicListQueryOptions = {}) => {
    const db = getDbClient();
    const results = getDynamicListResultPage(userId, spec, options);

    const rows = results.items;
    const listItems = new Map<string, DynamicListListItem & { providerRating: number | null }>();

    for (const mediaType of new Set(rows.map(row => row.mediaType))) {
        const definition = getServerMediaDefinition(mediaType);
        const { listTable, mediaTable } = definition.repository.tables;

        const mediaIds = rows.filter(row => row.mediaType === mediaType).map(row => row.mediaId);

        // Reuse each media's list projection so progress, tags and rating presentation stay identical
        const selected = db.select({
            ...getMediaListSelection(definition.repository),
            providerRating: sql<number | null>`${definition.repository.sortColumns.providerRating ?? sql`NULL`}`,
        })
            .from(listTable)
            .innerJoin(user, eq(listTable.userId, user.id))
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), inArray(listTable.mediaId, mediaIds)))
            .all();

        for (const item of selected) {
            const listItem = { ...item, common: false } as DynamicListListItem & { providerRating: number | null };
            listItems.set(`${mediaType}-${item.mediaId}`, listItem);
        }
    }

    const items: DynamicListItem[] = rows.map(row => {
        const item = listItems.get(`${row.mediaType}-${row.mediaId}`)!;
        return {
            ...row,
            ...item,
            imageCover: getImageUrl(getServerMediaDefinition(row.mediaType).identity.coverDirectory, item.customCover ?? item.imageCover),
        };
    });

    return { ...results, items };
};


export const getDynamicListSummary = (userId: number, spec: DynamicListSpec) => {
    const { total, items, mediaTypes } = getDynamicListResultPage(userId, spec, { perPage: 4 });

    return {
        total,
        mediaTypes,
        covers: items.map(({ mediaType, mediaId, title, imageCover }) => ({
            mediaType, mediaId, title,
            imageCover: getImageUrl(getServerMediaDefinition(mediaType).identity.coverDirectory, imageCover),
        })),
    };
};


export const getDynamicListEditorFilterOptions = (userId: number, selectedTypes: DynamicListSpec["mediaTypes"]) => {
    const db = getDbClient();
    const mediaTypes = selectedTypes === "all" ? ALL_MEDIA_TYPES : selectedTypes;

    const sources = mediaTypes.map(mediaType => {
        const definition = getServerMediaDefinition(mediaType).repository;
        const { listTable, tagTable, genreTable } = definition.tables;

        const ownedActiveList = sql`
            SELECT ${listTable.mediaId} 
            FROM ${listTable}
            INNER JOIN ${userMediaSettings} ON ${userMediaSettings.userId} = ${listTable.userId}
                AND ${userMediaSettings.mediaType} = ${mediaType}
            WHERE ${listTable.userId} = ${userId} 
                AND ${userMediaSettings.active} = 1`;

        return {
            mediaType,
            metadata: getMediaMetadataFilterOptions(definition, { mediaIds: ownedActiveList, userId }),
            genres: definition.filters.common.genres ? sql`
                SELECT ${genreTable.name} AS "name" 
                FROM ${genreTable}
                WHERE ${genreTable.mediaId} IN (${ownedActiveList})` : sql`SELECT NULL AS "name" WHERE 0`,

            tags: definition.filters.common.tags ? sql`
                SELECT ${tagTable.name} AS "name" 
                FROM ${tagTable}
                WHERE ${tagTable.userId} = ${userId} AND ${tagTable.mediaId} IN (${ownedActiveList})` : sql`SELECT NULL AS "name" WHERE 0`,
        };
    });

    return {
        mediaFilters: Object.fromEntries(sources.map(source => [source.mediaType, source.metadata])) as ScopedMediaFilterOptions,
        genres: db.all<{ name: string }>(sql`
            SELECT DISTINCT "name" 
            FROM (${sql.join(sources.map(source => source.genres), sql` UNION ALL `)})
            ORDER BY "name" COLLATE NOCASE
        `).map(row => row.name),

        tags: db.all<{ name: string }>(sql`
            SELECT DISTINCT "name" 
            FROM (${sql.join(sources.map(source => source.tags), sql` UNION ALL `)})
            ORDER BY "name" COLLATE NOCASE
        `).map(row => row.name),
    };
};
