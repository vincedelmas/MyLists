import {Status} from "@/lib/utils/enums";
import {eq, notInArray, sql} from "drizzle-orm";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {mediaTags, userMediaSettings} from "@/lib/server/database/schema";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {DynamicListRuntimeFilters, DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {getMediaCommonFilterConditions, getMediaScopedFilterConditions} from "@/lib/server/domain/media/base/media-filters.queries";


const statusGroups = {
    on_hold: [Status.ON_HOLD],
    dropped: [Status.DROPPED],
    completed: [Status.COMPLETED],
    in_progress: [Status.WATCHING, Status.READING, Status.PLAYING],
    planned: [Status.PLAN_TO_WATCH, Status.PLAN_TO_READ, Status.PLAN_TO_PLAY],
} satisfies Record<NonNullable<DynamicListSpec["filters"]["statusGroup"]>, Status[]>;


export const createDynamicListSources = (userId: number, spec: DynamicListSpec, tagNames: Record<number, string>, {
    now = new Date(), viewerId, filters: runtimeFilters,
}: { now?: Date; viewerId?: number; filters?: DynamicListRuntimeFilters } = {}) => {
    const { filters } = spec;
    const browseFilters = runtimeFilters ?? {};

    const mediaTypes = spec.mediaTypes === "all" ? ALL_MEDIA_TYPES : spec.mediaTypes;
    const cutoffs: Partial<Record<"addedBefore" | "addedWithin" | "updatedBefore", string>> = {};

    if (browseFilters.hideCommon && viewerId === undefined) {
        throw new FormattedError("Sign in to hide media in your own list.");
    }

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

    return mediaTypes.map(mediaType => {
        const allowedStatuses = getMediaDefinition(mediaType).statuses;
        const definition = getServerMediaDefinition(mediaType).repository;
        const { tables: { mediaTable, listTable, tagTable, genreTable }, sortColumns } = definition;

        const conditions = [sql`${listTable.userId} = ${userId}`, sql`${userMediaSettings.active} = 1`];
        conditions.push(
            ...getMediaCommonFilterConditions(definition, {
                minRating: filters.minRating, favorite: filters.favorite, genres: filters.genres,
            }, userId),
            ...getMediaScopedFilterConditions(definition, filters.mediaFilters?.[mediaType], userId),
        );

        if (definition.filters.common.search && filters.search) {
            conditions.push(sql`INSTR(LOWER(${mediaTable.name}), LOWER(${filters.search})) > 0`);
        }

        if (definition.filters.common.status) {
            for (const selected of [filters.statusGroup ? statusGroups[filters.statusGroup] : undefined, filters.statuses]) {
                if (!selected) continue;

                const statuses = selected.filter(status => allowedStatuses.includes(status));
                conditions.push(statuses.length
                    ? sql`${listTable.status} IN (${sql.join(statuses.map(status => sql`${status}`), sql`, `)})`
                    : sql`0`);
            }
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

        for (const rule of filters.mediaFilters?.[mediaType]?.tagRules ?? []) {
            conditions.push(...getMediaScopedFilterConditions(definition, {
                tags: rule.tags?.map(id => tagNames[id]),
                tagsMatch: rule.tagsMatch,
                excludeTags: rule.excludeTags?.map(id => tagNames[id]),
            }, userId));
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
            ...getMediaScopedFilterConditions(definition, browseFilters.mediaFilters?.[mediaType], userId),
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

            tagQuery: definition.filters.common.tags ? sql`SELECT ${mediaTags.name} AS "name"
                FROM ${tagTable} INNER JOIN ${mediaTags} ON ${mediaTags.id} = ${tagTable.tagId}
                WHERE ${tagTable.userId} = ${userId} 
                    AND ${tagTable.mediaId} IN (SELECT "mediaId" FROM (${baseQuery}))` : sql`SELECT NULL AS "name" WHERE 0`,
        };
    });

};
