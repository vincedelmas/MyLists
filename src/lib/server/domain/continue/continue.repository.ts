import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {ContinueSearch} from "@/lib/schemas/continue.schema";
import {and, asc, count, desc, eq, inArray, not, sql} from "drizzle-orm";
import {MediaListDataByType, TListByType} from "@/lib/server/domain/media/media-list.types";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {animeEpisodesPerSeason, animeList, books, booksList, manga, mangaList, seriesEpisodesPerSeason, seriesList} from "@/lib/server/database/schema";


export type ContinueMediaType = Exclude<MediaType, typeof MediaType.MOVIES>;


type ContinueItem = {
    [T in ContinueMediaType]: Omit<MediaListDataByType[T]["items"][number], "common" | "ratingSystem">
    & TListByType[T] & ContinueStateByType[T] & { mediaType: T };
}[ContinueMediaType];


export const getContinueItem = (userId: number, mediaType: ContinueMediaType, mediaId: number): ContinueItem | null => {
    const { repository: { listQuery, tables: { listTable, mediaTable } } } = getServerMediaDefinition(mediaType);

    const item = getDbClient()
        .select(listQuery.selection)
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


export const getContinueItems = async (
    userId: number,
    mediaTypes: ContinueMediaType[],
    { page: requestedPage = 1, activeTab, preview = false }: ContinueSearch & { preview?: boolean } = {},
) => {
    const perPage = preview ? 5 : 12;
    const counts: Partial<Record<ContinueMediaType, number>> = {};

    const candidates = mediaTypes.map(mediaType => {
        const { repository: { tables: { listTable, mediaTable } } } = getServerMediaDefinition(mediaType);
        const conditions = [eq(listTable.userId, userId), eq(listTable.status, getMediaDefinition(mediaType).continue.status)];

        // The preview excludes cards whose next action only marks them completed
        // Keep this SQL in sync with shared continue definitions (covered by repo tests)
        if (preview) {
            if (mediaType === MediaType.BOOKS) {
                conditions.push(not(sql`COALESCE(${books.pages} > 0 AND COALESCE(${booksList.actualPage}, 0) = ${books.pages}, 0)`));
            }
            else if (mediaType === MediaType.MANGA) {
                conditions.push(not(sql`COALESCE(${manga.chapters} > 0 AND ${mangaList.currentChapter} = ${manga.chapters}, 0)`));
            }
            else if (mediaType === MediaType.SERIES || mediaType === MediaType.ANIME) {
                const tvList = mediaType === MediaType.SERIES ? seriesList : animeList;
                const seasons = mediaType === MediaType.SERIES ? seriesEpisodesPerSeason : animeEpisodesPerSeason;

                conditions.push(not(sql`EXISTS (
                    SELECT 1 FROM ${seasons}
                    WHERE ${seasons.mediaId} = ${mediaTable.id}
                        AND ${seasons.season} = (SELECT MAX(s.season) FROM ${seasons} s WHERE s.media_id = ${mediaTable.id})
                        AND ${seasons.season} = ${tvList.currentSeason}
                        AND ${seasons.episodes} > 0
                        AND ${seasons.episodes} = ${tvList.currentEpisode}
                )`));
            }
        }

        counts[mediaType] = getDbClient()
            .select({ total: count() })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(...conditions))
            .get()!.total;

        return getDbClient()
            .select({
                name: mediaTable.name,
                mediaId: listTable.mediaId,
                mediaType: sql<ContinueMediaType>`${mediaType}`.as("media_type"),
                updatedAt: sql<string>`COALESCE(${listTable.lastUpdated}, ${listTable.addedAt}, '')`.as("updated_at"),
            }).from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(...conditions))
            .$dynamic();
    });

    const selectedType = mediaTypes.find(type => type === activeTab);
    const totalItems = selectedType ? counts[selectedType]! : Object.values(counts).reduce((sum, value) => sum + value, 0);

    const totalPages = Math.ceil(totalItems / perPage);
    const page = Math.min(requestedPage, Math.max(1, totalPages));

    const pagination = { page, perPage, totalItems, totalPages };
    if (candidates.length === 0) {
        return {
            counts,
            pagination,
            items: [] as ContinueItem[],
        };
    }

    const combined = candidates
        .slice(1)
        .reduce((query, next) => query.unionAll(next), candidates[0])
        .as("continue_candidates");

    const refs = await getDbClient()
        .select()
        .from(combined)
        .where(selectedType ? eq(combined.mediaType, selectedType) : undefined)
        .orderBy(desc(combined.updatedAt), asc(combined.name), asc(combined.mediaType), asc(combined.mediaId))
        .limit(perPage)
        .offset((page - 1) * perPage);

    // Hydrate full list details only for requested page, including TV season data
    const groups = await Promise.all(mediaTypes.map(async mediaType => {
        const mediaIds = refs.filter(ref => ref.mediaType === mediaType).map(ref => ref.mediaId);
        if (mediaIds.length === 0) return [];

        const { repository: { listQuery, tables: { listTable, mediaTable } } } = getServerMediaDefinition(mediaType);

        const items = await getDbClient()
            .select(listQuery.selection)
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(eq(listTable.userId, userId), inArray(listTable.mediaId, mediaIds)));

        return items.map(item => ({
            ...item,
            mediaType,
            imageCover: item.customCover ?? item.imageCover,
        })) as ContinueItem[];
    }));

    const byKey = new Map(groups.flat().map(item => [`${item.mediaType}-${item.mediaId}`, item]));

    return {
        counts,
        pagination,
        items: refs.map(ref => byKey.get(`${ref.mediaType}-${ref.mediaId}`)!),
    };
};
