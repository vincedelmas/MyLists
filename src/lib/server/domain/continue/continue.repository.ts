import {toItemKey} from "@/lib/utils/media/item-key";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {ContinueSearch} from "@/lib/schemas/continue.schema";
import {and, asc, count, desc, eq, inArray, sql} from "drizzle-orm";
import {MediaType, Status, type TvMediaType} from "@/lib/utils/enums";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import {MediaListDataByType, TListByType} from "@/lib/server/domain/media/media-list.types";


export type ContinueMediaType = Exclude<MediaType, typeof MediaType.MOVIES>;


type ContinueItem = {
    [T in ContinueMediaType]: Omit<MediaListDataByType[T]["items"][number], "common" | "ratingSystem">
    & TListByType[T] & ContinueStateByType[T] & { mediaType: T }
    & (T extends TvMediaType ? { duration: number } : T extends typeof MediaType.GAMES ? { hltbMainTime: number | null } : unknown);
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
        const { repository: { tables: { listTable, mediaTable }, continuePreviewCondition } } = getServerMediaDefinition(mediaType);
        const conditions = [eq(listTable.userId, userId), eq(listTable.status, Status.IN_PROGRESS)];

        if (preview && continuePreviewCondition) {
            conditions.push(continuePreviewCondition);
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

    const byKey = new Map(groups.flat().map(item => [toItemKey(item), item]));

    return {
        counts,
        pagination,
        items: refs.map(ref => byKey.get(toItemKey(ref))!),
    };
};
