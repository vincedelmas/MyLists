import {and, eq, sql} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {removeCommonLibraryEntry} from "@/lib/server/domain/media/shared/library/common-library.entries";
import {catalogItem, libraryActivity, libraryChange, LibraryChangeValue, libraryEntry, libraryStats} from "@/lib/server/database/schema";


export type LibraryStatsSnapshot = {
    time: number;
    redo: number;
    rated: number;
    userId: number;
    status: Status;
    rating: number;
    specific: number;
    commented: number;
    favorited: number;
};


export type LibraryActivityContribution = {
    redo: boolean;
    completed: boolean;
    unitsGained: number;
};


export const applyLibraryStatsTransition = async (kind: MediaType, before?: LibraryStatsSnapshot, after?: LibraryStatsSnapshot) => {
    const sample = after ?? before;
    if (!sample) return;

    const current = getDbClient()
        .select()
        .from(libraryStats)
        .where(and(eq(libraryStats.userId, sample.userId), eq(libraryStats.kind, kind)))
        .get();

    const beforeMetrics = before ?? emptySnapshot(sample.userId, sample.status);
    const afterMetrics = after ?? emptySnapshot(sample.userId, sample.status);
    const statusCounts = { ...(current?.statusCounts ?? {}) };

    if (before) statusCounts[before.status] = Math.max(0, (statusCounts[before.status] ?? 0) - 1);
    if (after) statusCounts[after.status] = (statusCounts[after.status] ?? 0) + 1;

    const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
    const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);

    const stats = {
        kind,
        ratingSum,
        statusCounts,
        entriesRated,
        userId: sample.userId,
        averageRating: entriesRated > 0 ? ratingSum / entriesRated : null,
        totalRedo: Math.max(0, (current?.totalRedo ?? 0) + afterMetrics.redo - beforeMetrics.redo),
        totalEntries: Math.max(0, (current?.totalEntries ?? 0) + Number(!!after) - Number(!!before)),
        timeSpentMinutes: Math.max(0, (current?.timeSpentMinutes ?? 0) + afterMetrics.time - beforeMetrics.time),
        totalSpecific: Math.max(0, (current?.totalSpecific ?? 0) + afterMetrics.specific - beforeMetrics.specific),
        entriesCommented: Math.max(0, (current?.entriesCommented ?? 0) + afterMetrics.commented - beforeMetrics.commented),
        entriesFavorited: Math.max(0, (current?.entriesFavorited ?? 0) + afterMetrics.favorited - beforeMetrics.favorited),
    };

    await getDbClient()
        .insert(libraryStats)
        .values(stats)
        .onConflictDoUpdate({
            target: [libraryStats.userId, libraryStats.kind],
            set: { ...stats, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
};


export const recordLibraryEntryCreated = async (kind: MediaType, params: { entryId: number; snapshot: LibraryStatsSnapshot; activity: LibraryActivityContribution }) => {
    await applyLibraryStatsTransition(kind, undefined, params.snapshot);
    await recordLibraryChange(params.entryId, UpdateType.STATUS, null, params.snapshot.status);
    await recordLibraryActivity(params.entryId, params.activity);
};


export const recordLibraryEntryTransition = async (kind: MediaType, params: {
    entryId: number;
    loggedAt?: string;
    updateType: UpdateType;
    after: LibraryStatsSnapshot;
    before: LibraryStatsSnapshot;
    oldValue: LibraryChangeValue;
    newValue: LibraryChangeValue;
    activity: LibraryActivityContribution;
}) => {
    await applyLibraryStatsTransition(kind, params.before, params.after);
    await recordLibraryActivity(params.entryId, params.activity, params.loggedAt);
    await recordLibraryChange(params.entryId, params.updateType, params.oldValue, params.newValue, params.loggedAt);
};


export const removeLibraryEntryWithStats = async (kind: MediaType, entryId: number, snapshot: LibraryStatsSnapshot) => {
    await applyLibraryStatsTransition(kind, snapshot, undefined);
    await removeCommonLibraryEntry(entryId);
};


const recordLibraryChange = async (entryId: number, updateType: UpdateType, oldValue: LibraryChangeValue, newValue: LibraryChangeValue, occurredAt?: string) => {
    await getDbClient()
        .insert(libraryChange)
        .values({
            updateType,
            libraryEntryId: entryId,
            payload: { oldValue, newValue },
            occurredAt: occurredAt ?? sql`CURRENT_TIMESTAMP`,
        });
};


const recordLibraryActivity = async (entryId: number, contribution: LibraryActivityContribution, loggedAt?: string) => {
    const identity = getDbClient()
        .select({
            kind: catalogItem.kind,
            userId: libraryEntry.userId,
            catalogItemId: libraryEntry.catalogItemId,
        })
        .from(libraryEntry)
        .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
        .where(eq(libraryEntry.id, entryId))
        .get();

    if (!identity) throw new Error("Library entry was not found while recording activity.");

    const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();
    const monthBucket = monthBucketFromDateInput(new Date(occurredAt));

    if (contribution.unitsGained > 0) {
        await getDbClient()
            .insert(libraryActivity)
            .values({
                ...identity,
                monthBucket,
                redo: contribution.redo,
                libraryEntryId: entryId,
                lastUpdatedAt: occurredAt,
                completed: contribution.completed,
                unitsGained: contribution.unitsGained,
            })
            .onConflictDoUpdate({
                target: [libraryActivity.userId, libraryActivity.catalogItemId, libraryActivity.monthBucket],
                set: {
                    libraryEntryId: entryId,
                    lastUpdatedAt: sql`excluded.last_updated_at`,
                    redo: sql`${libraryActivity.redo} OR excluded.redo`,
                    hidden: sql`${libraryActivity.hidden} AND excluded.hidden`,
                    completed: sql`${libraryActivity.completed} OR excluded.completed`,
                    unitsGained: sql`${libraryActivity.unitsGained} + excluded.units_gained`,
                },
            });
        return;
    }

    if (contribution.unitsGained === 0 && (contribution.completed || contribution.redo)) {
        await getDbClient()
            .update(libraryActivity)
            .set({
                lastUpdatedAt: occurredAt,
                redo: sql`${libraryActivity.redo} OR ${contribution.redo}`,
                completed: sql`${libraryActivity.completed} OR ${contribution.completed}`,
            })
            .where(and(
                eq(libraryActivity.userId, identity.userId),
                eq(libraryActivity.catalogItemId, identity.catalogItemId),
                eq(libraryActivity.monthBucket, monthBucket),
            ));
    }
};


const emptySnapshot = (userId: number, status: Status): LibraryStatsSnapshot => {
    return { userId, status, time: 0, redo: 0, rated: 0, rating: 0, specific: 0, commented: 0, favorited: 0 };
}
