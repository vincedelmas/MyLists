import {MediaType} from "@/lib/utils/enums";
import {and, eq, inArray, sql} from "drizzle-orm";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import type {IdNamePair} from "@/lib/types/media-common.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {getDynamicListTagNames} from "./dynamic-list-tags.queries";
import {createDynamicListSources} from "./dynamic-list-sources.queries";
import type {ScopedMediaFilterOptions} from "@/lib/types/media-list.types";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {mediaTags, user, userMediaSettings} from "@/lib/server/database/schema";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import type {MediaListDataByType} from "@/lib/server/domain/media/media-list.types";
import {getMediaListSelection} from "@/lib/server/domain/media/base/media-list.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import type {DynamicListRuntimeFilters, DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {getMediaMetadataFilterOptions} from "@/lib/server/domain/media/base/media-filters.queries";


type DynamicListListItem = MediaListDataByType[MediaType]["items"][number];


type DynamicListItem = DynamicListListItem & {
    title: string;
    mediaType: MediaType;
    releaseDate: string | null;
    providerRating: number | null;
};


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
    const browseFilters = runtimeFilters ?? {};
    const mediaTypes = spec.mediaTypes === "all" ? ALL_MEDIA_TYPES : spec.mediaTypes;
    const sources = createDynamicListSources(userId, spec, getDynamicListTagNames(userId, [spec]), {
        now, viewerId, filters: runtimeFilters,
    });
    let sortKey = browseFilters.sorting && browseFilters.sorting !== "default" ? browseFilters.sorting : undefined;

    const db = getDbClient();
    const availableMediaTypes = db.all<{ mediaType: MediaType }>(sql`
        ${sql.join(sources.map(source => sql`
            SELECT ${source.mediaType} AS "mediaType"
            WHERE EXISTS (${source.baseQuery})
        `), sql` UNION ALL `)}
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
    const [{ total }] = db.all<{ total: number }>(sql`
        SELECT SUM("total") AS "total"
        FROM (${sql.join(sources.map(source => sql`SELECT COUNT(*) AS "total" ${source.from}`), sql` UNION ALL `)})
    `);

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

    if (includeFilterOptions) {
        for (const source of sources) {
            filterOptions.mediaFilters[source.mediaType] = {
                ...getMediaMetadataFilterOptions(source.definition, {
                    userId, mediaIds: sql`SELECT "mediaId" FROM (${source.baseQuery})`,
                }),
                genres: db.all<{ name: string }>(sql`SELECT DISTINCT "name" FROM (${source.genreQuery}) ORDER BY "name" COLLATE NOCASE`),
                tags: db.all<{ name: string }>(sql`SELECT DISTINCT "name" FROM (${source.tagQuery}) ORDER BY "name" COLLATE NOCASE`),
            };
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


type DynamicListSummary = {
    total: number;
    mediaTypes: MediaType[];
    covers: { mediaType: MediaType; mediaId: number; title: string; imageCover: string }[];
};


export const getDynamicListSummaries = (userId: number, views: { id: number; spec: DynamicListSpec }[], { includeCovers = true } = {}) => {
    const summaries = new Map<number, DynamicListSummary>();
    const tagNames = getDynamicListTagNames(userId, views.map(view => view.spec));

    const db = getDbClient();
    const now = new Date();

    // Bound compound SELECTs and parameters even when filtering a large directory of views.
    for (let offset = 0; offset < views.length; offset += 8) {
        const batch = views.slice(offset, offset + 8).map(view => ({
            ...view, sources: createDynamicListSources(userId, view.spec, tagNames, { now }),
        }));

        for (const view of batch) {
            summaries.set(view.id, { total: 0, mediaTypes: [], covers: [] });
        }

        const counts = db.all<{ viewId: number; mediaType: MediaType; total: number }>(sql`
            ${sql.join(batch.flatMap(view => view.sources.map(source => sql`
                SELECT ${view.id} AS "viewId", ${source.mediaType} AS "mediaType", COUNT(*) AS "total"
                ${source.from}
            `)), sql` UNION ALL `)}
        `);

        for (const { viewId, mediaType, total } of counts) {
            const summary = summaries.get(viewId)!;
            summary.total += total;
            if (total > 0) summary.mediaTypes.push(mediaType);
        }

        if (includeCovers) {
            const covers = db.all<{ viewId: number; mediaType: MediaType; mediaId: number; title: string; imageCover: string }>(sql`
                ${sql.join(batch.map(view => {
                const sort = view.spec.sort;
                const direction = sort.direction === "asc" ? sql`ASC` : sql`DESC`;
                return sql`
                        SELECT ${view.id} AS "viewId", "mediaType", "mediaId", "title", "imageCover"
                        FROM (
                            ${sql.join(view.sources.map(source => sql`
                                SELECT ${source.selection}, ${source.sortColumns[sort.field] ?? sql`NULL`} AS "sortValue"
                                ${source.from}
                            `), sql` UNION ALL `)}
                            ORDER BY "sortValue" ${direction} NULLS LAST, "title" COLLATE NOCASE ASC, "mediaType" ASC, "mediaId" ASC
                            LIMIT 4
                        )
                    `;
            }), sql` UNION ALL `)}
            `);

            for (const { viewId, ...cover } of covers) {
                summaries.get(viewId)!.covers.push({
                    ...cover, imageCover: getImageUrl(getServerMediaDefinition(cover.mediaType).identity.coverDirectory, cover.imageCover),
                });
            }
        }
    }

    return summaries;
};


export const getDynamicListSummary = (userId: number, spec: DynamicListSpec) => {
    return getDynamicListSummaries(userId, [{ id: 0, spec }]).get(0)!;
};


export const getDynamicListEditorFilterOptions = (userId: number, selectedTypes: DynamicListSpec["mediaTypes"]) => {
    const db = getDbClient();
    const mediaTypes = selectedTypes === "all" ? ALL_MEDIA_TYPES : selectedTypes;

    const sources = mediaTypes.map(mediaType => {
        const definition = getServerMediaDefinition(mediaType).repository;
        const { listTable, genreTable } = definition.tables;

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
                SELECT ${mediaTags.id} AS "id", ${mediaTags.name} AS "name"
                FROM ${mediaTags}
                WHERE ${mediaTags.userId} = ${userId} AND ${mediaTags.mediaType} = ${mediaType}
                    AND EXISTS (SELECT 1 FROM ${userMediaSettings}
                        WHERE ${userMediaSettings.userId} = ${userId} AND ${userMediaSettings.mediaType} = ${mediaType}
                            AND ${userMediaSettings.active} = 1)` : sql`SELECT NULL AS "id", NULL AS "name" WHERE 0`,
        };
    });

    return {
        mediaFilters: Object.fromEntries(sources.map(source => [source.mediaType, {
            ...source.metadata,
            genres: db.all<{ name: string }>(sql`SELECT DISTINCT "name" FROM (${source.genres}) ORDER BY "name" COLLATE NOCASE`),
            tags: db.all<{ id: number; name: string }>(sql`SELECT "id", "name" FROM (${source.tags}) ORDER BY "name" COLLATE NOCASE`),
        }])) as ScopedMediaFilterOptions<IdNamePair>,
        genres: db.all<{ name: string }>(sql`
            SELECT DISTINCT "name" 
            FROM (${sql.join(sources.map(source => source.genres), sql` UNION ALL `)})
            ORDER BY "name" COLLATE NOCASE
        `).map(row => row.name),
    };
};
