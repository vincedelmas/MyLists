import {and, eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaListDataByType} from "@/lib/server/domain/media/media-list.types";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";


export type ContinueMediaType = Exclude<MediaType, typeof MediaType.MOVIES>;


type ContinueItem = {
    [T in ContinueMediaType]: Omit<MediaListDataByType[T]["items"][number], "tags" | "common" | "ratingSystem">
        & ContinueStateByType[T] & { mediaType: T };
}[ContinueMediaType];


export const getContinueItem = (userId: number, mediaType: ContinueMediaType, mediaId: number): ContinueItem | null => {
    const { repository: { listQuery, tables: { listTable, mediaTable } } } = getServerMediaDefinition(mediaType);

    const item = getDbClient()
        .select(listQuery.selection)
        .from(listTable)
        .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
        .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
        .get();

    return item ? { ...item, mediaType, imageCover: item.customCover ?? item.imageCover } as ContinueItem : null;
};


export const getContinueItems = async (userId: number, mediaTypes: ContinueMediaType[]): Promise<ContinueItem[]> => {
    const groups = await Promise.all(mediaTypes.map(async (mediaType) => {
        const { repository: { listQuery, tables: { listTable, mediaTable } } } = getServerMediaDefinition(mediaType);

        const status = getMediaDefinition(mediaType).continue.status;

        const items = await getDbClient()
            .select(listQuery.selection)
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
