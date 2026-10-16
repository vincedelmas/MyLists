import {sql, type SQL, type SQLWrapper} from "drizzle-orm";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import type {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import type {BaseMediaTables} from "@/lib/media-definitions/base/media.definition.server";
import {MEDIA_SORT_DEFINITIONS, type MediaSortField, type MediaSortKey} from "@/lib/media-definitions/base/media-sorting";


type CommonMediaSortField = "title" | "rating" | "addedAt" | "lastUpdated" | "releaseDate";


export type MediaSortColumns = Record<CommonMediaSortField, SQLWrapper>
    & Partial<Record<Exclude<MediaSortField, CommonMediaSortField>, SQLWrapper>>;


export const getCommonMediaSortColumns = ({ mediaTable, listTable }: Pick<BaseMediaTables, "mediaTable" | "listTable">) => {
    return {
        rating: listTable.rating,
        title: sql`${mediaTable.name} COLLATE NOCASE`,
        addedAt: sql`JULIANDAY(${listTable.addedAt})`,
        lastUpdated: sql`JULIANDAY(${listTable.lastUpdated})`,
        releaseDate: sql`JULIANDAY(${mediaTable.releaseDate})`,
    };
}


export const createMediaSortOrder = (key: MediaSortKey, columns: MediaSortColumns) => {
    const sort = MEDIA_SORT_DEFINITIONS[key];
    const direction = sort.direction === "asc" ? sql`ASC` : sql`DESC`;

    return sql`${columns[sort.field]!} ${direction} NULLS LAST`;
};


export const createMediaListSorts = <const TDefinition extends Pick<MediaDefinition, "sorting">>(
    definition: TDefinition,
    columns: MediaSortColumns & Record<typeof MEDIA_SORT_DEFINITIONS[TDefinition["sorting"]["options"][number]]["field"], SQLWrapper>,
    mediaIdColumn: SQLWrapper,
) => {
    return Object.fromEntries(definition.sorting.options.map(key => [getMediaSortLabel(definition, key), [
        createMediaSortOrder(key, columns),
        sql`${columns.title} ASC`,
        sql`${mediaIdColumn} ASC`,
    ] as [SQL, ...SQL[]]]));
}
