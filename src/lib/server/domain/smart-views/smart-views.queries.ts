import {MediaType, Status} from "@/lib/utils/enums";
import {and, eq, inArray, sql, type SQL} from "drizzle-orm";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {MediaListData} from "@/lib/types/media-list.types";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {user, userMediaSettings} from "@/lib/server/database/schema";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {getMediaListSelection} from "@/lib/server/domain/media/base/media-list.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {animeList, booksList, gamesList, mangaList, moviesList, seriesList} from "@/lib/server/database/schema";


type SmartViewListItem = MediaListData<
    typeof animeList.$inferSelect
    | typeof booksList.$inferSelect
    | typeof gamesList.$inferSelect
    | typeof mangaList.$inferSelect
    | typeof moviesList.$inferSelect
    | typeof seriesList.$inferSelect
>["items"][number];


type SmartViewItem = SmartViewListItem & {
    title: string;
    status: Status;
    mediaId: number;
    imageCover: string;
    mediaType: MediaType;
    rating: number | null;
    providerRating: number | null;
    addedAt: string | null;
    favorite: boolean | null;
    lastUpdated: string | null;
    releaseDate: string | null;
};


const statusGroups = {
    on_hold: [Status.ON_HOLD],
    dropped: [Status.DROPPED],
    completed: [Status.COMPLETED],
    in_progress: [Status.WATCHING, Status.READING, Status.PLAYING],
    planned: [Status.PLAN_TO_WATCH, Status.PLAN_TO_READ, Status.PLAN_TO_PLAY],
} satisfies Record<NonNullable<SmartViewSpec["filters"]["statusGroup"]>, Status[]>;


type SmartViewQueryOptions = {
    now?: Date;
    page?: number;
    filters?: Omit<MediaBrowseFilters, "page">;
};


const getSmartViewResultPage = (userId: number, spec: SmartViewSpec, { page = 1, perPage = 24, now = new Date(), filters: runtimeFilters }: SmartViewQueryOptions & {
    perPage?: number
} = {}) => {
    const { filters } = spec;
    const browseFilters = runtimeFilters ?? {};
    const mediaTypes = spec.mediaTypes === "all" ? ALL_MEDIA_TYPES : spec.mediaTypes;
    const cutoffs: Partial<Record<"addedBefore" | "addedWithin" | "updatedBefore", string>> = {};

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
        const { tables: { mediaTable, listTable, tagTable, genreTable }, sortColumns } = getServerMediaDefinition(mediaType).repository;
        const conditions = [sql`${listTable.userId} = ${userId}`, sql`${userMediaSettings.active} = 1`];

        if (filters.search) {
            conditions.push(sql`INSTR(LOWER(${mediaTable.name}), LOWER(${filters.search})) > 0`);
        }

        if (filters.statusGroup) {
            const statuses = statusGroups[filters.statusGroup].filter(s => allowedStatuses.includes(s));
            conditions.push(statuses.length
                ? sql`${listTable.status} IN (${sql.join(statuses.map(status => sql`${status}`), sql`, `)})`
                : sql`0`);
        }

        if (filters.statuses) {
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

        if (filters.minRating !== undefined) {
            conditions.push(sql`${listTable.rating} >= ${filters.minRating}`);
        }

        if (filters.maxRating !== undefined) {
            conditions.push(sql`${listTable.rating} <= ${filters.maxRating}`);
        }

        if (filters.rated !== undefined) {
            conditions.push(filters.rated ? sql`${listTable.rating} IS NOT NULL` : sql`${listTable.rating} IS NULL`);
        }

        if (filters.favorite !== undefined) {
            conditions.push(sql`COALESCE(${listTable.favorite}, 0) = ${Number(filters.favorite)}`);
        }

        if (filters.hasComment !== undefined) {
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

        if (filters.genres) {
            conditions.push(sql`EXISTS (
                SELECT 1 
                FROM ${genreTable} 
                WHERE ${genreTable.mediaId} = ${listTable.mediaId}
                    AND ${genreTable.name} IN (${sql.join(filters.genres.map(genre => sql`${genre}`), sql`, `)})
            )`);
        }

        if (filters.tags) {
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

        if (filters.excludeTags) {
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

        const browseConditions: SQL[] = [];

        if (browseFilters.mediaType && browseFilters.mediaType !== mediaType) {
            browseConditions.push(sql`0`);
        }

        if (browseFilters.search) {
            browseConditions.push(sql`INSTR(LOWER(${mediaTable.name}), LOWER(${browseFilters.search})) > 0`);
        }

        if (browseFilters.status) {
            browseConditions.push(sql`${listTable.status} = ${browseFilters.status}`);
        }

        if (browseFilters.library === "out") {
            browseConditions.push(sql`0`);
        }

        if (browseFilters.favorite) {
            browseConditions.push(sql`${listTable.favorite} = 1`);
        }

        if (browseFilters.minRating !== undefined) {
            browseConditions.push(sql`${listTable.rating} >= ${browseFilters.minRating}`);
        }

        if (browseFilters.genres?.length) {
            browseConditions.push(sql`EXISTS (
                SELECT 1 
                FROM ${genreTable} 
                WHERE ${genreTable.mediaId} = ${listTable.mediaId}
                    AND ${genreTable.name} IN (${sql.join(browseFilters.genres.map(genre => sql`${genre}`), sql`, `)})
            )`);
        }

        if (browseFilters.tags?.length) {
            browseConditions.push(sql`EXISTS (
                SELECT 1 
                FROM ${tagTable} 
                WHERE ${tagTable.userId} = ${userId} 
                    AND ${tagTable.mediaId} = ${listTable.mediaId}
                    AND ${tagTable.name} IN (${sql.join(browseFilters.tags.map(tag => sql`${tag}`), sql`, `)})
            )`);
        }

        return {
            mediaType,
            selection,
            sortColumns,
            baseQuery,
            from: browseConditions.length
                ? sql`${from} AND ${sql.join(browseConditions, sql` AND `)}`
                : from,

            genreQuery: sql`SELECT ${genreTable.name} AS "name" 
                FROM ${genreTable}
                WHERE ${genreTable.mediaId} IN (SELECT "mediaId" FROM (${baseQuery}))`,

            tagQuery: sql`SELECT ${tagTable.name} AS "name" 
                FROM ${tagTable}
                WHERE ${tagTable.userId} = ${userId} 
                    AND ${tagTable.mediaId} IN (SELECT "mediaId" FROM (${baseQuery}))`,
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

    const filterOptions: { genres: string[]; tags: string[] } = { genres: [], tags: [] };

    if (runtimeFilters) {
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


export const getSmartViewResults = (userId: number, spec: SmartViewSpec, options: SmartViewQueryOptions = {}) => {
    const db = getDbClient();
    const results = getSmartViewResultPage(userId, spec, options);

    const rows = results.items;
    const listItems = new Map<string, SmartViewListItem & { providerRating: number | null }>();

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
            const listItem = { ...item, common: false } as SmartViewListItem & { providerRating: number | null };
            listItems.set(`${mediaType}-${item.mediaId}`, listItem);
        }
    }

    const items: SmartViewItem[] = rows.map(row => {
        const item = listItems.get(`${row.mediaType}-${row.mediaId}`)!;
        return {
            ...row,
            ...item,
            imageCover: getImageUrl(getServerMediaDefinition(row.mediaType).identity.coverDirectory, item.customCover ?? item.imageCover),
        };
    });

    return { ...results, items };
};


export const getSmartViewSummary = (userId: number, spec: SmartViewSpec) => {
    const { total, items } = getSmartViewResultPage(userId, spec, { perPage: 4 });

    return {
        total,
        covers: items.map(({ mediaType, mediaId, title, imageCover }) => ({
            mediaType, mediaId, title,
            imageCover: getImageUrl(getServerMediaDefinition(mediaType).identity.coverDirectory, imageCover),
        })),
    };
};


export const getSmartViewEditorFilterOptions = (userId: number, selectedTypes: SmartViewSpec["mediaTypes"]) => {
    const db = getDbClient();
    const mediaTypes = selectedTypes === "all" ? ALL_MEDIA_TYPES : selectedTypes;

    const sources = mediaTypes.map(mediaType => {
        const { listTable, tagTable, genreTable } = getServerMediaDefinition(mediaType).repository.tables;

        const ownedActiveList = sql`
            SELECT ${listTable.mediaId} 
            FROM ${listTable}
            INNER JOIN ${userMediaSettings} ON ${userMediaSettings.userId} = ${listTable.userId}
                AND ${userMediaSettings.mediaType} = ${mediaType}
            WHERE ${listTable.userId} = ${userId} 
                AND ${userMediaSettings.active} = 1`;

        return {
            genres: sql`
                SELECT ${genreTable.name} AS "name" 
                FROM ${genreTable}
                WHERE ${genreTable.mediaId} IN (${ownedActiveList})`,

            tags: sql`
                SELECT ${tagTable.name} AS "name" 
                FROM ${tagTable}
                WHERE ${tagTable.userId} = ${userId} AND ${tagTable.mediaId} IN (${ownedActiveList})`,
        };
    });

    return {
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
