import {and, count, eq, sql} from "drizzle-orm";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, TagAction, UpdateType} from "@/lib/utils/enums";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";
import {catalogItem, libraryActivity, libraryChange, libraryEntry, libraryEntryTag, libraryStats, libraryTag, profileMediaChannel,} from "@/lib/server/database/schema";


export const createLibraryEntry = async (params: typeof libraryEntry.$inferInsert) => {
    const [entry] = await getDbClient()
        .insert(libraryEntry)
        .values(params)
        .returning({ id: libraryEntry.id });

    return entry.id;
};


export const updateLibraryEntry = async (entryId: number, fields: Partial<typeof libraryEntry.$inferInsert>) => {
    await getDbClient()
        .update(libraryEntry)
        .set({
            ...fields,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(libraryEntry.id, entryId));
};


export const removeLibraryEntry = async (entryId: number) => {
    await getDbClient()
        .delete(libraryEntry)
        .where(eq(libraryEntry.id, entryId));
};


export const getLibraryStats = (userId: number, kind: MediaType) => {
    return getDbClient()
        .select()
        .from(libraryStats)
        .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, kind)))
        .get();
};


export const saveLibraryStats = async (stats: typeof libraryStats.$inferInsert) => {
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
};


export const recordLibraryChange = async (entryId: number, updateType: UpdateType, oldValue: LibraryChangeValue, newValue: LibraryChangeValue, occurredAt?: string) => {
    const [change] = await getDbClient()
        .insert(libraryChange)
        .values({
            updateType,
            libraryEntryId: entryId,
            payload: { oldValue, newValue },
            occurredAt: occurredAt ?? sql`CURRENT_TIMESTAMP`,
        }).returning({ id: libraryChange.id });

    return change.id;
};


const getActivityIdentity = async (entryId: number) => {
    const identity = getDbClient()
        .select({
            userId: libraryEntry.userId,
            catalogItemId: libraryEntry.catalogItemId,
            kind: catalogItem.kind,
        }).from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .where(eq(libraryEntry.id, entryId)).get();

    if (!identity) throw new Error("Library entry was not found while recording activity.");

    return identity;
};


export const recordLibraryActivity = async (params: {
    redo: boolean;
    entryId: number;
    completed: boolean;
    occurredAt: string;
    monthBucket: string;
    unitsGained: number;
}) => {
    const identity = await getActivityIdentity(params.entryId);

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
            }).onConflictDoUpdate({
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
            }).where(and(
                eq(libraryActivity.userId, identity.userId),
                eq(libraryActivity.catalogItemId, identity.catalogItemId),
                eq(libraryActivity.monthBucket, params.monthBucket),
            ));
    }
};


export const synchronizeLibraryProfileChannel = async (userId: number, kind: MediaType, enabled: boolean, views: number) => {
    await getDbClient()
        .insert(profileMediaChannel)
        .values({
            kind,
            userId,
            enabled,
            views: Math.max(0, views),
        }).onConflictDoUpdate({
            target: [profileMediaChannel.userId, profileMediaChannel.kind],
            set: {
                enabled,
                views: Math.max(0, views),
            },
        });
};


export const editLibraryTag = async (params: {
    name: string;
    userId: number;
    kind: MediaType;
    oldName?: string;
    action: TagAction;
    libraryEntryId?: number;
}) => {
    if (params.action === TagAction.ADD) {
        const [tag] = await getDbClient()
            .insert(libraryTag)
            .values({
                kind: params.kind,
                name: params.name,
                userId: params.userId,
            })
            .onConflictDoUpdate({
                target: [libraryTag.userId, libraryTag.kind, libraryTag.name],
                set: { name: sql`excluded.name` },
            }).returning({ id: libraryTag.id });

        if (params.libraryEntryId) {
            await getDbClient()
                .insert(libraryEntryTag)
                .values({
                    tagId: tag.id,
                    libraryEntryId: params.libraryEntryId,
                })
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
            eq(libraryTag.kind, params.kind),
            eq(libraryTag.name, oldName),
        )).get();

    if (!currentTag) return;

    if (params.action === TagAction.RENAME) {
        const collision = getDbClient()
            .select({ id: libraryTag.id })
            .from(libraryTag).where(and(
                eq(libraryTag.userId, params.userId),
                eq(libraryTag.kind, params.kind),
                eq(libraryTag.name, params.name),
            )).get();

        if (collision) throw new FormattedError("A tag with this name already exists.");

        await getDbClient()
            .update(libraryTag)
            .set({ name: params.name })
            .where(eq(libraryTag.id, currentTag.id));

        return { name: params.name };
    }

    if (params.action === TagAction.DELETE_ALL) {
        await getDbClient()
            .delete(libraryTag)
            .where(eq(libraryTag.id, currentTag.id));
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

        if (links === 0) {
            await getDbClient()
                .delete(libraryTag)
                .where(eq(libraryTag.id, currentTag.id));
        }
    }
};
