import {and, count, eq, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    catalogItem,
    libraryActivity,
    libraryChange,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    profileMediaChannel,
} from "@/lib/server/database/schema";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";


/** Persistence shared by concrete family repositories; it contains no progress rules. */
export class LibraryCommonRepository {
    async createEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        favorite?: boolean;
        comment?: string | null;
        rating?: number | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const [entry] = await getDbClient().insert(libraryEntry).values(params).returning({ id: libraryEntry.id });
        return entry.id;
    }

    async updateEntry(
        entryId: number,
        fields: Partial<Pick<typeof libraryEntry.$inferInsert, "status" | "rating" | "comment" | "favorite" | "customCover">>,
    ) {
        await getDbClient()
            .update(libraryEntry)
            .set({ ...fields, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(libraryEntry.id, entryId));
    }

    async removeEntry(entryId: number) {
        await getDbClient().delete(libraryEntry).where(eq(libraryEntry.id, entryId));
    }

    async getStats(userId: number, kind: MediaType) {
        return getDbClient().select().from(libraryStats)
            .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, kind))).get();
    }

    async saveStats(stats: typeof libraryStats.$inferInsert) {
        await getDbClient().insert(libraryStats).values(stats).onConflictDoUpdate({
            target: [libraryStats.userId, libraryStats.kind],
            set: {
                timeSpentMinutes: stats.timeSpentMinutes,
                totalEntries: stats.totalEntries,
                totalRedo: stats.totalRedo,
                entriesRated: stats.entriesRated,
                ratingSum: stats.ratingSum,
                entriesCommented: stats.entriesCommented,
                entriesFavorited: stats.entriesFavorited,
                totalSpecific: stats.totalSpecific,
                statusCounts: stats.statusCounts,
                averageRating: stats.averageRating,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            },
        });
    }

    async recordChange(entryId: number, updateType: UpdateType, oldValue: unknown, newValue: unknown, occurredAt?: string) {
        const [change] = await getDbClient().insert(libraryChange).values({
            libraryEntryId: entryId,
            updateType,
            payload: { oldValue, newValue },
            occurredAt: occurredAt ?? sql`CURRENT_TIMESTAMP`,
        }).returning({ id: libraryChange.id });
        return change.id;
    }

    async recordActivity(params: {
        entryId: number;
        unitsGained: number;
        completed: boolean;
        redo: boolean;
        monthBucket: string;
        occurredAt: string;
    }) {
        const identity = await this.getActivityIdentity(params.entryId);
        if (params.unitsGained > 0) {
            await getDbClient().insert(libraryActivity).values({
                ...identity,
                libraryEntryId: params.entryId,
                unitsGained: params.unitsGained,
                completed: params.completed,
                redo: params.redo,
                monthBucket: params.monthBucket,
                lastUpdatedAt: params.occurredAt,
            }).onConflictDoUpdate({
                target: [libraryActivity.userId, libraryActivity.catalogItemId, libraryActivity.monthBucket],
                set: {
                    libraryEntryId: params.entryId,
                    unitsGained: sql`${libraryActivity.unitsGained} + excluded.units_gained`,
                    completed: sql`${libraryActivity.completed} OR excluded.completed`,
                    redo: sql`${libraryActivity.redo} OR excluded.redo`,
                    hidden: sql`${libraryActivity.hidden} AND excluded.hidden`,
                    lastUpdatedAt: sql`excluded.last_updated_at`,
                },
            });
            return;
        }
        if (params.unitsGained === 0 && (params.completed || params.redo)) {
            await getDbClient().update(libraryActivity).set({
                completed: sql`${libraryActivity.completed} OR ${params.completed}`,
                redo: sql`${libraryActivity.redo} OR ${params.redo}`,
                lastUpdatedAt: params.occurredAt,
            }).where(and(
                eq(libraryActivity.userId, identity.userId),
                eq(libraryActivity.catalogItemId, identity.catalogItemId),
                eq(libraryActivity.monthBucket, params.monthBucket),
            ));
        }
    }

    private async getActivityIdentity(entryId: number) {
        const identity = await getDbClient().select({
            userId: libraryEntry.userId,
            catalogItemId: libraryEntry.catalogItemId,
            kind: catalogItem.kind,
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(eq(libraryEntry.id, entryId)).get();
        if (!identity) throw new Error("Library entry was not found while recording activity.");
        return identity;
    }

    async synchronizeProfileChannel(userId: number, kind: MediaType, enabled: boolean, views: number) {
        await getDbClient().insert(profileMediaChannel).values({
            userId,
            kind,
            enabled,
            views: Math.max(0, views),
        }).onConflictDoUpdate({
            target: [profileMediaChannel.userId, profileMediaChannel.kind],
            set: { enabled, views: Math.max(0, views) },
        });
    }

    async editTag(params: {
        userId: number;
        kind: MediaType;
        action: TagAction;
        name: string;
        oldName?: string;
        libraryEntryId?: number;
    }) {
        if (params.action === TagAction.ADD) {
            const [tag] = await getDbClient().insert(libraryTag)
                .values({ userId: params.userId, kind: params.kind, name: params.name })
                .onConflictDoUpdate({
                    target: [libraryTag.userId, libraryTag.kind, libraryTag.name],
                    set: { name: sql`excluded.name` },
                }).returning({ id: libraryTag.id });
            if (params.libraryEntryId) {
                await getDbClient().insert(libraryEntryTag)
                    .values({ libraryEntryId: params.libraryEntryId, tagId: tag.id }).onConflictDoNothing();
            }
            return { name: params.name };
        }

        const oldName = params.action === TagAction.RENAME ? params.oldName : params.name;
        if (!oldName) return;
        const currentTag = await getDbClient().select({ id: libraryTag.id }).from(libraryTag).where(and(
            eq(libraryTag.userId, params.userId),
            eq(libraryTag.kind, params.kind),
            eq(libraryTag.name, oldName),
        )).get();
        if (!currentTag) return;

        if (params.action === TagAction.RENAME) {
            const collision = await getDbClient().select({ id: libraryTag.id }).from(libraryTag).where(and(
                eq(libraryTag.userId, params.userId),
                eq(libraryTag.kind, params.kind),
                eq(libraryTag.name, params.name),
            )).get();
            if (collision) throw new FormattedError("A tag with this name already exists.");
            await getDbClient().update(libraryTag).set({ name: params.name }).where(eq(libraryTag.id, currentTag.id));
            return { name: params.name };
        }
        if (params.action === TagAction.DELETE_ALL) {
            await getDbClient().delete(libraryTag).where(eq(libraryTag.id, currentTag.id));
            return;
        }
        if (params.action === TagAction.DELETE_ONE && params.libraryEntryId) {
            await getDbClient().delete(libraryEntryTag).where(and(
                eq(libraryEntryTag.libraryEntryId, params.libraryEntryId),
                eq(libraryEntryTag.tagId, currentTag.id),
            ));
            const [{ links }] = await getDbClient().select({ links: count(libraryEntryTag.libraryEntryId) })
                .from(libraryEntryTag).where(eq(libraryEntryTag.tagId, currentTag.id));
            if (links === 0) await getDbClient().delete(libraryTag).where(eq(libraryTag.id, currentTag.id));
        }
    }
}
