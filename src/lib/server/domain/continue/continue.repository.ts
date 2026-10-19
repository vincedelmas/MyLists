import {and, eq, sql} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {EpsPerSeasonType} from "@/lib/types/media-list.types";
import {MediaListDataByType} from "@/lib/server/domain/media/media-list.types";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {animeEpisodesPerSeason, seriesEpisodesPerSeason} from "@/lib/server/database/schema";


export type ContinueMediaType = Exclude<MediaType, typeof MediaType.MOVIES>;


type ContinueItem = {
    [T in ContinueMediaType]: Omit<MediaListDataByType[T]["items"][number], "common" | "ratingSystem">
    & ContinueStateByType[T]
    & { mediaType: T; addedAt: string | null; lastUpdated: string | null };
}[ContinueMediaType];


const getContinueSelection = (mediaType: ContinueMediaType) => {
    const { repository: { listQuery, tables } } = getServerMediaDefinition(mediaType);

    const epsPerSeasonTable = mediaType === MediaType.SERIES
        ? seriesEpisodesPerSeason
        : mediaType === MediaType.ANIME
            ? animeEpisodesPerSeason
            : undefined;

    return {
        ...listQuery.selection,
        addedAt: tables.listTable.addedAt,
        lastUpdated: tables.listTable.lastUpdated,
        ...(epsPerSeasonTable ? {
            epsPerSeason: sql<EpsPerSeasonType[]>`(
                SELECT
                    json_group_array(json_object('season', ${epsPerSeasonTable.season}, 'episodes', ${epsPerSeasonTable.episodes}))
                FROM ${epsPerSeasonTable}
                WHERE ${epsPerSeasonTable.mediaId} = ${tables.mediaTable.id}
            )`.mapWith(JSON.parse),
        } : {}),
    };
};


export const getContinueItem = (userId: number, mediaType: ContinueMediaType, mediaId: number): ContinueItem | null => {
    const definition = getServerMediaDefinition(mediaType);
    const { repository: { tables: { listTable, mediaTable } } } = definition;

    const item = getDbClient()
        .select(getContinueSelection(mediaType))
        .from(listTable)
        .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
        .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
        .get();

    return item
        ? {
            ...item,
            mediaType,
            imageCover: item.customCover ?? item.imageCover,
        } as ContinueItem
        : null;
};


export const getContinueItems = async (userId: number, mediaTypes: ContinueMediaType[]): Promise<ContinueItem[]> => {
    const groups = await Promise.all(mediaTypes.map(async (mediaType) => {
        const definition = getServerMediaDefinition(mediaType);
        const { repository: { tables: { listTable, mediaTable } } } = definition;

        const status = getMediaDefinition(mediaType).continue.status;

        const items = await getDbClient()
            .select(getContinueSelection(mediaType))
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), eq(listTable.status, status)));

        return items.map(item => ({
            ...item,
            mediaType,
            imageCover: item.customCover ?? item.imageCover,
        })) as ContinueItem[];
    }));

    return groups.flat().sort((a, b) =>
        (b.lastUpdated ?? b.addedAt ?? "").localeCompare(a.lastUpdated ?? a.addedAt ?? "")
        || a.mediaName.localeCompare(b.mediaName)
        || a.mediaType.localeCompare(b.mediaType)
        || a.mediaId - b.mediaId
    );
};
