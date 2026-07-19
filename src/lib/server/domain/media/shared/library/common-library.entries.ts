import {SimpleSearch} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {CoverType} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, Status, TagAction} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, desc, eq, like, sql} from "drizzle-orm";
import {UpdateUserCustomCover} from "@/lib/contracts/media/library";
import {resolvePagination} from "@/lib/server/database/pagination";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {catalogItem, libraryChange, libraryEntry, libraryEntryTag, libraryStats, libraryTag, profileMediaChannel} from "@/lib/server/database/schema";


export type CommonLibraryFields = Partial<Pick<typeof libraryEntry.$inferInsert, "status" | "rating" | "comment" | "favorite" | "customCover">>;


export type CommonLibraryEntry = {
    id: number;
    userId: number;
    status: Status;
    favorite: boolean;
    catalogItemId: number;
    rating: number | null;
    comment: string | null;
    customCover: string | null;
};


export const findCommonLibraryEntry = (kind: MediaType, userId: number, catalogItemId: number): CommonLibraryEntry | undefined => {
    return getDbClient()
        .select({
            id: libraryEntry.id,
            userId: libraryEntry.userId,
            status: libraryEntry.status,
            rating: libraryEntry.rating,
            comment: libraryEntry.comment,
            favorite: libraryEntry.favorite,
            customCover: libraryEntry.customCover,
            catalogItemId: libraryEntry.catalogItemId,
        })
        .from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .where(and(
            eq(catalogItem.kind, kind),
            eq(libraryEntry.userId, userId),
            eq(libraryEntry.catalogItemId, catalogItemId),
        ))
        .get();
};


export const requireCommonLibraryEntry = (kind: MediaType, userId: number, catalogItemId: number) => {
    const entry = findCommonLibraryEntry(kind, userId, catalogItemId);
    if (!entry) throw new FormattedError("Media not in your list");

    return entry;
};


export const createCommonLibraryEntry = async (params: typeof libraryEntry.$inferInsert) => {
    const [entry] = await getDbClient()
        .insert(libraryEntry)
        .values(params)
        .returning({ id: libraryEntry.id });

    return entry.id;
};


export const updateCommonLibraryEntry = async (entryId: number, fields: CommonLibraryFields) => {
    await getDbClient()
        .update(libraryEntry)
        .set({ ...fields, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(libraryEntry.id, entryId));
};


export const removeCommonLibraryEntry = async (entryId: number) => {
    await getDbClient()
        .delete(libraryEntry)
        .where(eq(libraryEntry.id, entryId));
};


export const getCommonLibraryHistory = (kind: MediaType, userId: number, catalogItemId: number) => {
    return getDbClient()
        .select({
            id: libraryChange.id,
            mediaId: catalogItem.id,
            userId: libraryEntry.userId,
            mediaName: catalogItem.name,
            mediaType: catalogItem.kind,
            payload: libraryChange.payload,
            timestamp: libraryChange.occurredAt,
            updateType: libraryChange.updateType,
        })
        .from(libraryChange)
        .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .where(and(
            eq(catalogItem.kind, kind),
            eq(libraryEntry.userId, userId),
            eq(catalogItem.id, catalogItemId),
        ))
        .orderBy(desc(libraryChange.occurredAt), desc(libraryChange.id));
};


export const getCommonLibraryListHeader = (kind: MediaType, userId: number) => {
    const channel = getDbClient()
        .select({ enabled: profileMediaChannel.enabled })
        .from(profileMediaChannel)
        .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.kind, kind)))
        .get();

    if (!channel?.enabled) return;

    const stats = getDbClient()
        .select({ timeSpent: libraryStats.timeSpentMinutes })
        .from(libraryStats)
        .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, kind)))
        .get();

    return { timeSpent: stats?.timeSpent ?? 0 };
};


export const getCommonLibraryTagNames = (kind: MediaType, userId: number) => {
    return getDbClient()
        .select({ name: libraryTag.name })
        .from(libraryTag)
        .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, kind)))
        .orderBy(asc(libraryTag.name));
};


export const getCommonLibraryTagsView = async (kind: MediaType, ownerId: number, search: SimpleSearch) => {
    const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });

    const tagRows = await getDbClient()
        .select({ id: libraryTag.id, name: libraryTag.name })
        .from(libraryTag)
        .where(and(
            eq(libraryTag.userId, ownerId),
            eq(libraryTag.kind, kind),
            search.search ? like(libraryTag.name, `%${search.search}%`) : undefined,
        ));

    const linkedByTag = await Promise.all(tagRows.map(async (tag) => {
        const medias = await getDbClient()
            .select({
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                mediaCover: catalogItem.imageCover,
                activity: sql<string>`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`,
            })
            .from(libraryEntryTag)
            .innerJoin(libraryEntry, eq(libraryEntry.id, libraryEntryTag.libraryEntryId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(eq(libraryEntryTag.tagId, tag.id))
            .orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`));

        return {
            tagId: tag.id,
            tagName: tag.name,
            totalCount: medias.length,
            lastActivity: medias[0]?.activity ?? "",
            medias: medias.slice(0, 3).map(({ activity: _, mediaCover, ...media }) => ({
                ...media,
                mediaCover: getImageUrl(`${kind}-covers`, mediaCover),
            })),
        };
    }));

    linkedByTag.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity) || a.tagName.localeCompare(b.tagName));
    const items = linkedByTag
        .slice(pagination.offset, pagination.offset + pagination.limit)
        .map(({ lastActivity: _, ...tag }) => tag);
    const exactMatch = !!search.search && tagRows.some(({ name }) => name.toLowerCase() === search.search!.toLowerCase());

    return {
        total: tagRows.length,
        items,
        page: pagination.page,
        exactMatch,
        perPage: pagination.perPage,
        pages: Math.ceil(tagRows.length / pagination.perPage),
    };
};


export const synchronizeCommonLibraryProfileChannel = async (kind: MediaType, params: { userId: number; enabled: boolean; views: number }) => {
    await getDbClient()
        .insert(profileMediaChannel)
        .values({ kind, ...params, views: Math.max(0, params.views) })
        .onConflictDoUpdate({
            target: [profileMediaChannel.userId, profileMediaChannel.kind],
            set: { enabled: params.enabled, views: Math.max(0, params.views) },
        });
};


export const editCommonLibraryTag = async (kind: MediaType, params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string }; }) => {
    const libraryEntryId = params.mediaId
        ? findCommonLibraryEntry(kind, params.userId, params.mediaId)?.id
        : undefined;

    if (params.action === TagAction.ADD) {
        const [tag] = await getDbClient()
            .insert(libraryTag)
            .values({ kind, name: params.tag.name, userId: params.userId })
            .onConflictDoUpdate({
                target: [libraryTag.userId, libraryTag.kind, libraryTag.name],
                set: { name: sql`excluded.name` },
            })
            .returning({ id: libraryTag.id });

        if (libraryEntryId) {
            await getDbClient()
                .insert(libraryEntryTag)
                .values({ tagId: tag.id, libraryEntryId })
                .onConflictDoNothing();
        }

        return { name: params.tag.name };
    }

    const oldName = params.action === TagAction.RENAME ? params.tag.oldName : params.tag.name;
    if (!oldName) return;

    const currentTag = getDbClient()
        .select({ id: libraryTag.id })
        .from(libraryTag)
        .where(and(
            eq(libraryTag.kind, kind),
            eq(libraryTag.userId, params.userId),
            eq(libraryTag.name, oldName),
        ))
        .get();

    if (!currentTag) return;

    if (params.action === TagAction.RENAME) {
        const collision = getDbClient()
            .select({ id: libraryTag.id })
            .from(libraryTag)
            .where(and(
                eq(libraryTag.kind, kind),
                eq(libraryTag.userId, params.userId),
                eq(libraryTag.name, params.tag.name),
            ))
            .get();

        if (collision) throw new FormattedError("A tag with this name already exists.");

        await getDbClient()
            .update(libraryTag)
            .set({ name: params.tag.name })
            .where(eq(libraryTag.id, currentTag.id));

        return { name: params.tag.name };
    }

    if (params.action === TagAction.DELETE_ALL) {
        await getDbClient().delete(libraryTag).where(eq(libraryTag.id, currentTag.id));
        return;
    }

    if (params.action === TagAction.DELETE_ONE && libraryEntryId) {
        await getDbClient()
            .delete(libraryEntryTag)
            .where(and(
                eq(libraryEntryTag.libraryEntryId, libraryEntryId),
                eq(libraryEntryTag.tagId, currentTag.id),
            ));

        const [{ links }] = await getDbClient()
            .select({ links: count(libraryEntryTag.libraryEntryId) })
            .from(libraryEntryTag)
            .where(eq(libraryEntryTag.tagId, currentTag.id));

        if (links === 0) {
            await getDbClient()
                .delete(libraryTag)
                .where(eq(libraryTag.id, currentTag.id));
        }
    }
};


export const prepareCommonLibraryCustomCover = async (kind: MediaType, input: UpdateUserCustomCover) => {
    if (input.remove) return null;

    const dirSaveName: CoverType = `${kind}-covers`;

    const customCover = input.imageFile
        ? await saveUploadedImage({ dirSaveName, file: input.imageFile })
        : await saveImageFromUrl({ dirSaveName, imageUrl: input.imageUrl });

    if (!customCover || customCover === "default.jpg") {
        throw new FormattedError("Could not update the custom cover. Please choose another one.");
    }

    return customCover;
};
