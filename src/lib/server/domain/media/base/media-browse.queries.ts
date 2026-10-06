import type {Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import type {AnyServerMediaDefinition, BaseMediaTables} from "@/lib/media-definitions/base/media.definition.server";
import {and, asc, eq, exists, inArray, isNotNull, isNull, like, or, type SQL, sql, type SQLWrapper} from "drizzle-orm";
import {MEDIA_SORT_DEFINITIONS, type MediaSortField, type MediaSortKey} from "@/lib/media-definitions/base/media-sorting";


export const getMediaSortColumns = ({ mediaTable, listTable }: Pick<BaseMediaTables, "mediaTable" | "listTable">) => {
    return {
        redo: listTable.redo,
        pages: mediaTable.pages,
        rating: listTable.rating,
        playtime: listTable.playtime,
        chapters: mediaTable.chapters,
        providerRating: mediaTable.voteAverage,
        title: sql`${mediaTable.name} COLLATE NOCASE`,
        addedAt: sql`JULIANDAY(${listTable.addedAt})`,
        lastUpdated: sql`JULIANDAY(${listTable.lastUpdated})`,
        releaseDate: sql`JULIANDAY(${mediaTable.releaseDate})`,
    } satisfies Record<MediaSortField, SQLWrapper | undefined>;
}


const createMediaSortOrder = (key: MediaSortKey, columns: ReturnType<typeof getMediaSortColumns>) => {
    const sort = MEDIA_SORT_DEFINITIONS[key];
    const direction = sort.direction === "asc" ? sql`ASC` : sql`DESC`;

    return sql`${columns[sort.field]!} ${direction} NULLS LAST`;
};


export const createMediaListSorts = (definition: Pick<MediaDefinition, "sorting">, tables: Pick<BaseMediaTables, "mediaTable" | "listTable">) => {
    const columns = getMediaSortColumns(tables);

    return Object.fromEntries(definition.sorting.options.map(key =>
        [
            getMediaSortLabel(definition, key),
            [
                createMediaSortOrder(key, columns),
                sql`${tables.mediaTable.name} COLLATE NOCASE ASC`,
                sql`${tables.mediaTable.id} ASC`] as [SQL, ...SQL[]
            ],
        ],
    ));
};


export const createMediaBrowseQueryParts = (definition: AnyServerMediaDefinition, filters: MediaBrowseFilters, viewerId?: number) => {
    const { mediaTable, listTable, genreTable, tagTable } = definition.repository.tables;

    const sortKey = filters.sorting && filters.sorting !== "default"
        ? filters.sorting
        : undefined;

    const personalSorting = sortKey !== undefined && MEDIA_SORT_DEFINITIONS[sortKey].personal;

    if (viewerId === undefined && (
        filters.status !== undefined
        || filters.library !== undefined
        || filters.tags?.length
        || filters.favorite !== undefined
        || filters.minRating !== undefined
        || personalSorting
    )) {
        throw new FormattedError("Sign in to filter or sort by your own list.");
    }

    if (sortKey && !getMediaDefinition(definition.identity.mediaType).sorting.options.includes(sortKey)) {
        throw new FormattedError("This sorting is not available for this media type.");
    }

    const db = getDbClient();
    const conditions: SQL[] = [];

    if (filters.search) {
        const name = like(mediaTable.name, `%${filters.search}%`);
        conditions.push(mediaTable.originalName ? or(name, like(mediaTable.originalName, `%${filters.search}%`))! : name);
    }

    if (filters.status !== undefined) {
        conditions.push(eq(listTable.status, filters.status));
    }

    if (filters.library !== undefined) {
        conditions.push(filters.library === "in" ? isNotNull(listTable.userId) : isNull(listTable.userId));
    }

    if (filters.favorite !== undefined) {
        conditions.push(sql`COALESCE(${listTable.favorite}, 0) = ${Number(filters.favorite)}`);
    }

    if (filters.minRating !== undefined) {
        conditions.push(sql`${listTable.rating} >= ${filters.minRating}`);
    }

    if (filters.genres?.length) {
        conditions.push(exists(db
            .select({ mediaId: genreTable.mediaId })
            .from(genreTable)
            .where(and(eq(genreTable.mediaId, mediaTable.id), inArray(genreTable.name, filters.genres)))));
    }

    if (filters.tags?.length) {
        conditions.push(exists(db
            .select({ mediaId: tagTable.mediaId })
            .from(tagTable)
            .where(and(
                eq(tagTable.userId, viewerId!),
                eq(tagTable.mediaId, mediaTable.id),
                inArray(tagTable.name, filters.tags),
            ))));
    }

    const sortOrder = sortKey
        ? createMediaSortOrder(sortKey, getMediaSortColumns(definition.repository.tables))
        : undefined;

    return {
        conditions,

        viewerJoin: and(eq(listTable.mediaId, mediaTable.id), viewerId === undefined ? sql`FALSE` : eq(listTable.userId, viewerId)),

        selection: {
            mediaId: sql<number>`${mediaTable.id}`,
            mediaName: sql<string>`${mediaTable.name}`,
            status: sql<Status | null>`${listTable.status}`,
            rating: sql<number | null>`${listTable.rating}`,
            addedAt: sql<string | null>`${listTable.addedAt}`,
            inUserList: isNotNull(listTable.userId).mapWith(Boolean),
            lastUpdated: sql<string | null>`${listTable.lastUpdated}`,
            releaseDate: sql<string | null>`${mediaTable.releaseDate}`,
            favorite: sql<boolean | null>`${listTable.favorite}`.mapWith(value => value === null ? null : Boolean(value)),
            imageCover: sql<string>`COALESCE(${listTable.customCover}, ${mediaTable.imageCover})`
                .mapWith(value => getImageUrl(definition.identity.coverDirectory, value)),
        },

        orderBy(defaultOrder: SQL[]) {
            return [
                ...(sortOrder ? [sortOrder] : defaultOrder),
                sql`${mediaTable.name} COLLATE NOCASE ASC`, asc(mediaTable.id),
            ];
        },
    };
};
