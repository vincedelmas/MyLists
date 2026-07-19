import {SimpleSearch} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, asc, count, desc, eq, like, sql} from "drizzle-orm";
import {resolvePagination} from "@/lib/server/database/pagination";
import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";
import {catalogItem, libraryActivity, libraryChange, libraryEntry, libraryEntryTag, libraryStats, libraryTag, profileMediaChannel,} from "@/lib/server/database/schema";


export type CommonLibraryFields = Partial<Pick<typeof libraryEntry.$inferInsert, "status" | "rating" | "comment" | "favorite" | "customCover">>;


export class CommonLibraryRepository {
    constructor(readonly kind: MediaType) {
    }

    findEntry(userId: number, catalogItemId: number) {
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
                eq(libraryEntry.userId, userId),
                eq(libraryEntry.catalogItemId, catalogItemId),
                eq(catalogItem.kind, this.kind),
            ))
            .get();
    }

    async createEntry(params: typeof libraryEntry.$inferInsert) {
        const [entry] = await getDbClient()
            .insert(libraryEntry)
            .values(params)
            .returning({ id: libraryEntry.id });
        return entry.id;
    }

    async updateEntry(entryId: number, fields: CommonLibraryFields) {
        await getDbClient()
            .update(libraryEntry)
            .set({ ...fields, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(libraryEntry.id, entryId));
    }

    async removeEntry(entryId: number) {
        await getDbClient().delete(libraryEntry).where(eq(libraryEntry.id, entryId));
    }

    getStats(userId: number) {
        return getDbClient()
            .select()
            .from(libraryStats)
            .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, this.kind)))
            .get();
    }

    async saveStats(stats: typeof libraryStats.$inferInsert) {
        await getDbClient()
            .insert(libraryStats)
            .values(stats)
            .onConflictDoUpdate({
                target: [libraryStats.userId, libraryStats.kind],
                set: {
                    totalRedo: stats.totalRedo,
                    ratingSum: stats.ratingSum,
                    entriesRated: stats.entriesRated,
                    totalEntries: stats.totalEntries,
                    statusCounts: stats.statusCounts,
                    totalSpecific: stats.totalSpecific,
                    averageRating: stats.averageRating,
                    timeSpentMinutes: stats.timeSpentMinutes,
                    entriesCommented: stats.entriesCommented,
                    entriesFavorited: stats.entriesFavorited,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            });
    }

    async recordChange(
        entryId: number,
        updateType: UpdateType,
        oldValue: LibraryChangeValue,
        newValue: LibraryChangeValue,
        occurredAt?: string,
    ) {
        const [change] = await getDbClient()
            .insert(libraryChange)
            .values({
                updateType,
                libraryEntryId: entryId,
                payload: { oldValue, newValue },
                occurredAt: occurredAt ?? sql`CURRENT_TIMESTAMP`,
            })
            .returning({ id: libraryChange.id });
        return change.id;
    }

    async recordActivity(params: {
        redo: boolean;
        entryId: number;
        completed: boolean;
        occurredAt: string;
        monthBucket: string;
        unitsGained: number;
    }) {
        const identity = await this.getActivityIdentity(params.entryId);
        if (params.unitsGained > 0) {
            await getDbClient()
                .insert(libraryActivity)
                .values({
                    ...identity,
                    redo: params.redo,
                    completed: params.completed,
                    libraryEntryId: params.entryId,
                    unitsGained: params.unitsGained,
                    monthBucket: params.monthBucket,
                    lastUpdatedAt: params.occurredAt,
                })
                .onConflictDoUpdate({
                    target: [libraryActivity.userId, libraryActivity.catalogItemId, libraryActivity.monthBucket],
                    set: {
                        libraryEntryId: params.entryId,
                        lastUpdatedAt: sql`excluded.last_updated_at`,
                        redo: sql`${libraryActivity.redo} OR excluded.redo`,
                        hidden: sql`${libraryActivity.hidden} AND excluded.hidden`,
                        completed: sql`${libraryActivity.completed} OR excluded.completed`,
                        unitsGained: sql`${libraryActivity.unitsGained} + excluded.units_gained`,
                    },
                });
            return;
        }

        if (params.unitsGained === 0 && (params.completed || params.redo)) {
            await getDbClient()
                .update(libraryActivity)
                .set({
                    lastUpdatedAt: params.occurredAt,
                    redo: sql`${libraryActivity.redo} OR ${params.redo}`,
                    completed: sql`${libraryActivity.completed} OR ${params.completed}`,
                })
                .where(and(
                    eq(libraryActivity.userId, identity.userId),
                    eq(libraryActivity.catalogItemId, identity.catalogItemId),
                    eq(libraryActivity.monthBucket, params.monthBucket),
                ));
        }
    }

    async synchronizeProfileChannel(userId: number, enabled: boolean, views: number) {
        await getDbClient()
            .insert(profileMediaChannel)
            .values({ kind: this.kind, userId, enabled, views: Math.max(0, views) })
            .onConflictDoUpdate({
                target: [profileMediaChannel.userId, profileMediaChannel.kind],
                set: { enabled, views: Math.max(0, views) },
            });
    }

    async editTag(params: {
        name: string;
        userId: number;
        oldName?: string;
        action: TagAction;
        libraryEntryId?: number;
    }) {
        if (params.action === TagAction.ADD) {
            const [tag] = await getDbClient()
                .insert(libraryTag)
                .values({ kind: this.kind, name: params.name, userId: params.userId })
                .onConflictDoUpdate({
                    target: [libraryTag.userId, libraryTag.kind, libraryTag.name],
                    set: { name: sql`excluded.name` },
                })
                .returning({ id: libraryTag.id });

            if (params.libraryEntryId) {
                await getDbClient()
                    .insert(libraryEntryTag)
                    .values({ tagId: tag.id, libraryEntryId: params.libraryEntryId })
                    .onConflictDoNothing();
            }
            return { name: params.name };
        }

        const oldName = params.action === TagAction.RENAME ? params.oldName : params.name;
        if (!oldName) return;
        const currentTag = getDbClient()
            .select({ id: libraryTag.id })
            .from(libraryTag)
            .where(and(
                eq(libraryTag.userId, params.userId),
                eq(libraryTag.kind, this.kind),
                eq(libraryTag.name, oldName),
            ))
            .get();
        if (!currentTag) return;

        if (params.action === TagAction.RENAME) {
            const collision = getDbClient()
                .select({ id: libraryTag.id })
                .from(libraryTag)
                .where(and(
                    eq(libraryTag.userId, params.userId),
                    eq(libraryTag.kind, this.kind),
                    eq(libraryTag.name, params.name),
                ))
                .get();
            if (collision) throw new FormattedError("A tag with this name already exists.");
            await getDbClient().update(libraryTag).set({ name: params.name }).where(eq(libraryTag.id, currentTag.id));
            return { name: params.name };
        }

        if (params.action === TagAction.DELETE_ALL) {
            await getDbClient().delete(libraryTag).where(eq(libraryTag.id, currentTag.id));
            return;
        }

        if (params.action === TagAction.DELETE_ONE && params.libraryEntryId) {
            await getDbClient()
                .delete(libraryEntryTag)
                .where(and(
                    eq(libraryEntryTag.libraryEntryId, params.libraryEntryId),
                    eq(libraryEntryTag.tagId, currentTag.id),
                ));
            const [{ links }] = await getDbClient()
                .select({ links: count(libraryEntryTag.libraryEntryId) })
                .from(libraryEntryTag)
                .where(eq(libraryEntryTag.tagId, currentTag.id));
            if (links === 0) await getDbClient().delete(libraryTag).where(eq(libraryTag.id, currentTag.id));
        }
    }

    async getUserMediaHistory(userId: number, catalogItemId: number) {
        const rows = await getDbClient()
            .select({
                id: libraryChange.id,
                userId: libraryEntry.userId,
                mediaId: catalogItem.id,
                mediaName: catalogItem.name,
                mediaType: catalogItem.kind,
                updateType: libraryChange.updateType,
                payload: libraryChange.payload,
                timestamp: libraryChange.occurredAt,
            })
            .from(libraryChange)
            .innerJoin(libraryEntry, eq(libraryEntry.id, libraryChange.libraryEntryId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(
                eq(libraryEntry.userId, userId),
                eq(catalogItem.kind, this.kind),
                eq(catalogItem.id, catalogItemId),
            ))
            .orderBy(desc(libraryChange.occurredAt), desc(libraryChange.id));
        return rows;
    }

    async getListHeader(userId: number) {
        const channel = await getDbClient()
            .select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.kind, this.kind)))
            .get();
        if (!channel?.enabled) return;
        const stats = await this.getStats(userId);
        return { timeSpent: stats?.timeSpentMinutes ?? 0 };
    }

    getTagNames(userId: number) {
        return getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, this.kind)))
            .orderBy(asc(libraryTag.name));
    }

    async getTagsView(ownerId: number, search: SimpleSearch) {
        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const tagRows = await getDbClient()
            .select({ id: libraryTag.id, name: libraryTag.name })
            .from(libraryTag)
            .where(and(
                eq(libraryTag.userId, ownerId),
                eq(libraryTag.kind, this.kind),
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
                    mediaCover: getImageUrl(`${this.kind}-covers`, mediaCover),
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
    }

    private async getActivityIdentity(entryId: number) {
        const identity = getDbClient()
            .select({
                userId: libraryEntry.userId,
                catalogItemId: libraryEntry.catalogItemId,
                kind: catalogItem.kind,
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(eq(libraryEntry.id, entryId))
            .get();
        if (!identity) throw new Error("Library entry was not found while recording activity.");
        return identity;
    }
}
