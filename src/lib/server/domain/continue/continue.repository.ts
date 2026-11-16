import {MediaType, Status} from "@/lib/utils/enums";
import {toItemKey} from "@/lib/utils/media/item-key";
import {getDbClient} from "@/lib/server/database/async-storage";
import type {ContinueSearch} from "@/lib/schemas/continue.schema";
import {and, asc, count, eq, inArray, like, not, sql} from "drizzle-orm";
import type {MediaListRowByType} from "@/lib/server/domain/media/media-list.types";
import {createMediaSortOrder} from "@/lib/server/domain/media/base/media-sorting.queries";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


export type ContinueMediaType = Exclude<MediaType, typeof MediaType.MOVIES>;


type ContinueItem = {
    [T in ContinueMediaType]: MediaListRowByType[T] & { mediaType: T };
}[ContinueMediaType];


interface ContinueItemsProps {
    userId: number;
    mediaTypes: ContinueMediaType[];
    data: Omit<ContinueSearch, "display"> & { preview?: boolean };
}


export const getContinueItems = async ({ userId, mediaTypes, data }: ContinueItemsProps) => {
    const { search, progress, activeTab, preview = false, page: requestedPage = 1, sorting = "modified_newest" } = data;

    const perPage = preview ? 5 : 12;
    const counts: Partial<Record<ContinueMediaType, number>> = {};

    const candidates = mediaTypes.map(mt => {
        const { repository: { tables: { listTable, mediaTable }, continuePreviewCondition } } = getServerMediaDefinition(mt);
        const conditions = [eq(listTable.userId, userId), eq(listTable.status, Status.IN_PROGRESS)];

        if (search) {
            conditions.push(
                like(mediaTable.name, `%${search.replace(/[\\%_]/g, "\\$&")}%`).append(sql` ESCAPE '\\'`),
            );
        }

        if (!preview && progress === "ready") {
            conditions.push(continuePreviewCondition ? not(continuePreviewCondition) : sql`0`);
        }

        if ((preview || progress === "active") && continuePreviewCondition) {
            conditions.push(continuePreviewCondition);
        }

        counts[mt] = getDbClient()
            .select({ total: count() })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(...conditions))
            .get()!.total;

        return getDbClient()
            .select({
                name: mediaTable.name,
                mediaId: listTable.mediaId,
                mediaType: sql<ContinueMediaType>`${mt}`.as("media_type"),
                addedAt: sql<number>`JULIANDAY(${listTable.addedAt})`.as("added_at"),
                updatedAt: sql<number>`JULIANDAY(COALESCE(${listTable.lastUpdated}, ${listTable.addedAt}))`.as("updated_at"),
            }).from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(...conditions))
            .$dynamic();
    });

    const selectedType = mediaTypes.find(type => type === activeTab);

    const totalItems = selectedType
        ? counts[selectedType]!
        : Object.values(counts).reduce((sum, value) => sum + value, 0);

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

    const sortColumns = {
        addedAt: combined.addedAt,
        lastUpdated: combined.updatedAt,
        title: sql`${combined.name} COLLATE NOCASE`,
    };

    const refs = await getDbClient()
        .select()
        .from(combined)
        .where(selectedType ? eq(combined.mediaType, selectedType) : undefined)
        .orderBy(
            createMediaSortOrder(sorting, sortColumns),
            asc(combined.name), asc(combined.mediaType), asc(combined.mediaId),
        )
        .limit(perPage)
        .offset((page - 1) * perPage);

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


export const getContinueItem = (userId: number, mediaType: ContinueMediaType, mediaId: number): ContinueItem | null => {
    const { repository: { listQuery, tables: { listTable, mediaTable } } } = getServerMediaDefinition(mediaType);

    const item = getDbClient()
        .select(listQuery.selection)
        .from(listTable)
        .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id))
        .where(and(eq(listTable.userId, userId), eq(listTable.mediaId, mediaId)))
        .get();

    return item
        ? { ...item, mediaType, imageCover: item.customCover ?? item.imageCover } as ContinueItem
        : null;
};
