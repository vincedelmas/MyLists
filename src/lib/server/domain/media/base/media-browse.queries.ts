import type {Status} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {getImageUrl} from "@/lib/server/core/images/image-url";
import type {MediaBrowseFilters} from "@/lib/schemas/media-browse.schema";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MEDIA_SORT_DEFINITIONS} from "@/lib/media-definitions/base/media-sorting";
import {createMediaSortOrder} from "@/lib/server/domain/media/base/media-sorting.queries";
import {getMediaCommonFilterConditions, getMediaMetadataFilterConditions} from "@/lib/server/domain/media/base/media-filters.queries";
import type {AnyServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {and, asc, eq, isNotNull, isNull, type SQL, sql} from "drizzle-orm";


export const createMediaBrowseQueryParts = (definition: AnyServerMediaDefinition, filters: MediaBrowseFilters, viewerId?: number) => {
    const { mediaTable, listTable } = definition.repository.tables;

    const sortKey = filters.sorting && filters.sorting !== "default"
        ? filters.sorting
        : undefined;

    const personalSorting = sortKey !== undefined && MEDIA_SORT_DEFINITIONS[sortKey].personal;

    if (viewerId === undefined && (filters.library !== undefined || personalSorting)) {
        throw new FormattedError("Sign in to filter or sort by your own list.");
    }

    if (sortKey && !getMediaDefinition(definition.identity.mediaType).sorting.options.includes(sortKey)) {
        throw new FormattedError("This sorting is not available for this media type.");
    }

    const conditions: SQL[] = [
        ...getMediaCommonFilterConditions(definition.repository, {
            ...filters, status: filters.status === undefined ? undefined : [filters.status],
        }, viewerId),
        ...getMediaMetadataFilterConditions(definition.repository, filters.mediaFilters?.[definition.identity.mediaType], viewerId),
    ];

    if (filters.library !== undefined) {
        conditions.push(filters.library === "in" ? isNotNull(listTable.userId) : isNull(listTable.userId));
    }

    const sortOrder = sortKey
        ? createMediaSortOrder(sortKey, definition.repository.sortColumns)
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
