import {getImageUrl} from "@/lib/utils/image-url";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {CoverType} from "@/lib/types/media-common.types";
import {FormattedError} from "@/lib/utils/error-classes";
import {getDbClient} from "@/lib/server/database/async-storage";
import {resolvePagination} from "@/lib/server/database/pagination";
import {UpdateUserCustomCover} from "@/lib/contracts/media/library";
import {monthBucketFromDateInput} from "@/lib/utils/date-formatting";
import {and, asc, count, desc, eq, inArray, isNotNull, like, ne, notInArray, SQL, sql} from "drizzle-orm";
import {catalogGenre, catalogItem, catalogItemGenre, followers, user} from "@/lib/server/database/schema";
import {saveImageFromUrl, saveUploadedImage} from "@/lib/utils/image-saver";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {MediaType, PrivacyType, RatingSystemType, SocialState, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {CommonLibraryFields, CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {
    libraryActivity,
    libraryChange,
    LibraryChangeValue,
    libraryEntry,
    libraryEntryTag,
    libraryStats,
    libraryTag,
    profileMediaChannel
} from "@/lib/server/database/schema/library.schema";
import {alias} from "drizzle-orm/sqlite-core";
import {CommonLibraryListArgs} from "@/lib/server/domain/media/shared/library/library-shared-queries";


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


export class CommonLibraryService {
    constructor(private readonly repository: CommonLibraryRepository) {
    }

    getUserMediaHistory(userId: number, catalogItemId: number) {
        return this.repository.getUserMediaHistory(userId, catalogItemId);
    }

    getListHeader(userId: number) {
        return this.repository.getListHeader(userId);
    }

    getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        return this.repository.getTagsView(access.ownerId, search);
    }

    getTagNames(userId: number) {
        return this.repository.getTagNames(userId);
    }

    synchronizeProfileChannel(params: { userId: number; enabled: boolean; views: number }) {
        return this.repository.synchronizeProfileChannel(params.userId, params.enabled, params.views);
    }

    async editTag(params: {
        userId: number;
        mediaId?: number;
        action: TagAction;
        tag: { name: string; oldName?: string };
    }) {
        const libraryEntryId = params.mediaId
            ? (await this.repository.findEntry(params.userId, params.mediaId))?.id
            : undefined;
        return this.repository.editTag({
            libraryEntryId,
            userId: params.userId,
            action: params.action,
            name: params.tag.name,
            oldName: params.tag.oldName,
        });
    }

    updateRating(params: { userId: number; catalogItemId: number; rating: number | null }) {
        if (params.rating !== null && (params.rating < 0 || params.rating > 10)) {
            throw new FormattedError("Rating must be between 0 and 10.");
        }
        return this.updateFields(params, { rating: params.rating });
    }

    updateComment(params: { userId: number; catalogItemId: number; comment: string | null }) {
        return this.updateFields(params, { comment: params.comment });
    }

    updateFavorite(params: { userId: number; catalogItemId: number; favorite: boolean }) {
        return this.updateFields(params, { favorite: params.favorite });
    }

    async updateCustomCover(userId: number, input: UpdateUserCustomCover) {
        const current = await this.requireEntry(userId, input.mediaId);
        const customCover = await this.prepareCustomCover(input);
        return this.updateExistingEntry(current, { customCover });
    }

    async recordCreatedEntry(params: { entryId: number; snapshot: LibraryStatsSnapshot; activity: LibraryActivityContribution }) {
        await this.applyStatsTransition(undefined, params.snapshot);
        await this.repository.recordChange(params.entryId, UpdateType.STATUS, null, params.snapshot.status);
        await this.recordActivity(params.entryId, params.activity);
    }

    async recordEntryTransition(params: {
        entryId: number;
        before: LibraryStatsSnapshot;
        after: LibraryStatsSnapshot;
        activity: LibraryActivityContribution;
        updateType: UpdateType;
        oldValue: LibraryChangeValue;
        newValue: LibraryChangeValue;
        loggedAt?: string;
    }) {
        await this.applyStatsTransition(params.before, params.after);
        await this.recordActivity(params.entryId, params.activity, params.loggedAt);
        await this.repository.recordChange(
            params.entryId,
            params.updateType,
            params.oldValue,
            params.newValue,
            params.loggedAt,
        );
    }

    async removeEntry(entryId: number, snapshot: LibraryStatsSnapshot) {
        await this.applyStatsTransition(snapshot, undefined);
        await this.repository.removeEntry(entryId);
    }

    async applyStatsTransition(before?: LibraryStatsSnapshot, after?: LibraryStatsSnapshot) {
        const sample = after ?? before;
        if (!sample) return;
        const current = await this.repository.getStats(sample.userId);
        const beforeMetrics = before ?? emptySnapshot(sample.userId, sample.status);
        const afterMetrics = after ?? emptySnapshot(sample.userId, sample.status);
        const statusCounts = { ...(current?.statusCounts ?? {}) };
        if (before) statusCounts[before.status] = Math.max(0, (statusCounts[before.status] ?? 0) - 1);
        if (after) statusCounts[after.status] = (statusCounts[after.status] ?? 0) + 1;
        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);
        await this.repository.saveStats({
            ratingSum,
            statusCounts,
            entriesRated,
            kind: this.repository.kind,
            userId: sample.userId,
            averageRating: entriesRated > 0 ? ratingSum / entriesRated : null,
            totalRedo: Math.max(0, (current?.totalRedo ?? 0) + afterMetrics.redo - beforeMetrics.redo),
            totalEntries: Math.max(0, (current?.totalEntries ?? 0) + Number(!!after) - Number(!!before)),
            timeSpentMinutes: Math.max(0, (current?.timeSpentMinutes ?? 0) + afterMetrics.time - beforeMetrics.time),
            totalSpecific: Math.max(0, (current?.totalSpecific ?? 0) + afterMetrics.specific - beforeMetrics.specific),
            entriesCommented: Math.max(0, (current?.entriesCommented ?? 0) + afterMetrics.commented - beforeMetrics.commented),
            entriesFavorited: Math.max(0, (current?.entriesFavorited ?? 0) + afterMetrics.favorited - beforeMetrics.favorited),
        });
    }

    private async requireEntry(userId: number, catalogItemId: number) {
        const entry = await this.repository.findEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");
        return entry;
    }

    private async updateFields(
        params: { userId: number; catalogItemId: number },
        fields: CommonLibraryFields,
    ) {
        const current = await this.requireEntry(params.userId, params.catalogItemId);
        return this.updateExistingEntry(current, fields);
    }

    private async updateExistingEntry(
        current: Awaited<ReturnType<CommonLibraryRepository["findEntry"]>> & {},
        fields: CommonLibraryFields,
    ) {
        await this.repository.updateEntry(current.id, fields);
        const updated = await this.requireEntry(current.userId, current.catalogItemId);
        await this.applyStatsTransition(commonSnapshot(current), commonSnapshot(updated));
        return updated;
    }

    private async recordActivity(
        entryId: number,
        contribution: LibraryActivityContribution,
        loggedAt?: string,
    ) {
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();
        await this.repository.recordActivity({
            entryId,
            ...contribution,
            monthBucket: monthBucketFromDateInput(new Date(occurredAt)),
            occurredAt,
        });
    }

    private async prepareCustomCover(input: UpdateUserCustomCover) {
        if (input.remove) return null;
        const dirSaveName: CoverType = `${this.repository.kind}-covers`;
        const customCover = input.imageFile
            ? await saveUploadedImage({ dirSaveName, file: input.imageFile })
            : await saveImageFromUrl({ dirSaveName, imageUrl: input.imageUrl });
        if (!customCover || customCover === "default.jpg") {
            throw new FormattedError("Could not update the custom cover. Please choose another one.");
        }
        return customCover;
    }
}


const commonSnapshot = (entry: NonNullable<Awaited<ReturnType<CommonLibraryRepository["findEntry"]>>>): LibraryStatsSnapshot => {
    return ({
        time: 0,
        redo: 0,
        specific: 0,
        userId: entry.userId,
        status: entry.status,
        rating: entry.rating ?? 0,
        favorited: Number(entry.favorite),
        commented: Number(!!entry.comment),
        rated: Number(entry.rating !== null),
    });
}


const emptySnapshot = (userId: number, status: Status): LibraryStatsSnapshot => {
    return ({ userId, status, time: 0, redo: 0, rated: 0, rating: 0, specific: 0, commented: 0, favorited: 0 });
}


// ------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------


type CreateCommonLibraryParams<K extends MediaType, TEntry, TUserMedia> = {
    kind: K,
    findEntry: (userId: number, catalogItemId: number) => Promise<TEntry | undefined>;
    getContribution: (entry: TEntry) => ({ redo: number; specific: number; playtime: number });
    toUserMedia: (entry: TEntry, catalogItemId: number, ratingSystem: RatingSystemType, includeTags: boolean) => Promise<TUserMedia>;
}


export const createCommonLibrary = <
    K extends MediaType,
    TEntry,
    TUserMedia extends object
>({ kind, findEntry, toUserMedia, getContribution }: CreateCommonLibraryParams<K, TEntry, TUserMedia>) => {
    function commonSnapshot(entry: NonNullable<Awaited<ReturnType<typeof findCommonEntry>>>): LibraryStatsSnapshot {
        return ({
            time: 0,
            redo: 0,
            specific: 0,
            userId: entry.userId,
            status: entry.status,
            rating: entry.rating ?? 0,
            favorited: Number(entry.favorite),
            commented: Number(!!entry.comment),
            rated: Number(entry.rating !== null),
        });
    }

    function emptySnapshot(userId: number, status: Status): LibraryStatsSnapshot {
        return ({ userId, status, time: 0, redo: 0, rated: 0, rating: 0, specific: 0, commented: 0, favorited: 0 });
    }

    async function recordChange(entryId: number, updateType: UpdateType, oldValue: LibraryChangeValue, newValue: LibraryChangeValue, occurredAt?: string) {
        const [change] = await getDbClient()
            .insert(libraryChange)
            .values({
                updateType,
                libraryEntryId: entryId,
                payload: { oldValue, newValue },
                occurredAt: occurredAt ?? sql`CURRENT_TIMESTAMP`,
            }).returning({ id: libraryChange.id });

        return change.id;
    }

    async function prepareCustomCover(input: UpdateUserCustomCover) {
        if (input.remove) return null;

        const dirSaveName: CoverType = `${kind}-covers`;
        const customCover = input.imageFile
            ? await saveUploadedImage({ dirSaveName, file: input.imageFile })
            : await saveImageFromUrl({ dirSaveName, imageUrl: input.imageUrl });

        if (!customCover || customCover === "default.jpg") {
            throw new FormattedError("Could not update the custom cover. Please choose another one.");
        }

        return customCover;
    }

    async function getStats(userId: number) {
        return getDbClient()
            .select()
            .from(libraryStats)
            .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, kind)))
            .get();
    }

    async function findCommonEntry(userId: number, catalogItemId: number) {
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
            )).get();
    }

    async function requireEntry(userId: number, catalogItemId: number) {
        const entry = await findCommonEntry(userId, catalogItemId);
        if (!entry) throw new FormattedError("Media not in your list");

        return entry;
    }

    async function updateEntry(entryId: number, fields: CommonLibraryFields) {
        await getDbClient()
            .update(libraryEntry)
            .set({ ...fields, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(libraryEntry.id, entryId));
    }

    async function saveStats(stats: typeof libraryStats.$inferInsert) {
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

    async function applyStatsTransition(before?: LibraryStatsSnapshot, after?: LibraryStatsSnapshot) {
        const sample = after ?? before;
        if (!sample) return;

        const current = await getStats(sample.userId);
        const beforeMetrics = before ?? emptySnapshot(sample.userId, sample.status);
        const afterMetrics = after ?? emptySnapshot(sample.userId, sample.status);
        const statusCounts = { ...(current?.statusCounts ?? {}) };

        if (before) statusCounts[before.status] = Math.max(0, (statusCounts[before.status] ?? 0) - 1);
        if (after) statusCounts[after.status] = (statusCounts[after.status] ?? 0) + 1;

        const entriesRated = Math.max(0, (current?.entriesRated ?? 0) + afterMetrics.rated - beforeMetrics.rated);
        const ratingSum = Math.max(0, (current?.ratingSum ?? 0) + afterMetrics.rating - beforeMetrics.rating);

        await saveStats({
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
        });
    }

    async function updateExistingEntry(current: Awaited<ReturnType<typeof findCommonEntry>> & {}, fields: CommonLibraryFields) {
        await updateEntry(current.id, fields);
        const updated = await requireEntry(current.userId, current.catalogItemId);
        await applyStatsTransition(commonSnapshot(current), commonSnapshot(updated));

        return updated;
    }

    async function getActivityIdentity(entryId: number) {
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

    async function persistActivity(params: { redo: boolean; entryId: number; completed: boolean; occurredAt: string; monthBucket: string; unitsGained: number }) {
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

    async function recordActivity(entryId: number, contribution: LibraryActivityContribution, loggedAt?: string) {
        const occurredAt = loggedAt ? `${loggedAt} 12:00:00` : new Date().toISOString();

        await persistActivity({
            entryId,
            ...contribution,
            monthBucket: monthBucketFromDateInput(new Date(occurredAt)),
            occurredAt,
        });
    }

    async function executeRemoveEntry(entryId: number) {
        await getDbClient()
            .delete(libraryEntry)
            .where(eq(libraryEntry.id, entryId));
    }

    async function updateFields(params: { userId: number; catalogItemId: number }, fields: CommonLibraryFields) {
        const current = await requireEntry(params.userId, params.catalogItemId);
        return updateExistingEntry(current, fields);
    }

    return {
        async findUserMedia(userId: number | undefined, catalogItemId: number) {
            if (!userId) return null;

            const [entry, owner] = await Promise.all([
                findEntry(userId, catalogItemId),
                getDbClient()
                    .select({ ratingSystem: user.ratingSystem })
                    .from(user)
                    .where(eq(user.id, userId)).get(),
            ]);

            if (!entry || !owner) return null;

            return toUserMedia(entry, catalogItemId, owner.ratingSystem, true);
        },

        async findFollowedUsersLibraryMedia(viewerId: number | undefined, catalogItemId: number) {
            if (!viewerId) return [];

            const followedOwners = await getDbClient()
                .select({
                    id: user.id,
                    name: user.name,
                    image: user.image,
                    ratingSystem: user.ratingSystem,
                })
                .from(followers)
                .innerJoin(user, eq(user.id, followers.followedId))
                .innerJoin(libraryEntry, and(
                    eq(libraryEntry.userId, followers.followedId),
                    eq(libraryEntry.catalogItemId, catalogItemId),
                ))
                .innerJoin(profileMediaChannel, and(
                    eq(profileMediaChannel.kind, kind),
                    eq(profileMediaChannel.enabled, true),
                    eq(profileMediaChannel.userId, followers.followedId),
                ))
                .where(and(eq(followers.followerId, viewerId), eq(followers.status, SocialState.ACCEPTED)))
                .orderBy(asc(user.name));

            const results = await Promise.all(followedOwners.map(async (owner) => {
                const entry = await findEntry(owner.id, catalogItemId);
                if (!entry) return;

                return {
                    ...owner,
                    userMedia: await toUserMedia(entry, catalogItemId, owner.ratingSystem, false),
                };
            }));

            return results.filter((result): result is NonNullable<typeof result> => !!result);
        },

        async getLibraryCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType) {
            const pagination = resolvePagination({ page: search.page, perPage: search.perPage, defaultPerPage: 8, maxPerPage: 50 });

            const audienceCondition = viewerId
                ? sql`(
                    ${user.privacy} IN (${PrivacyType.PUBLIC}, ${PrivacyType.RESTRICTED})
                    OR ${user.id} = ${viewerId}
                    OR EXISTS (
                        SELECT 1 FROM ${followers} AS community_follow
                        WHERE community_follow.follower_id = ${viewerId}
                            AND community_follow.followed_id = ${user.id}
                            AND community_follow.status = ${SocialState.ACCEPTED}
                    )
                )`
                : eq(user.privacy, PrivacyType.PUBLIC);

            const visibleConditions = and(eq(libraryEntry.catalogItemId, catalogItemId), ne(user.name, "DemoProfile"), audienceCondition);

            const baseQuery = () => getDbClient()
                .select({
                    userId: user.id,
                    name: user.name,
                    image: user.image,
                    rating: libraryEntry.rating,
                    status: libraryEntry.status,
                    ratingSystem: user.ratingSystem,
                    favorite: libraryEntry.favorite,
                })
                .from(libraryEntry)
                .innerJoin(user, eq(user.id, libraryEntry.userId))
                .innerJoin(profileMediaChannel, and(
                    eq(profileMediaChannel.kind, kind),
                    eq(profileMediaChannel.enabled, true),
                    eq(profileMediaChannel.userId, libraryEntry.userId),
                ))
                .where(visibleConditions);

            const [allRows, pageRows] = await Promise.all([
                baseQuery(),
                baseQuery()
                    .orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`))
                    .limit(pagination.limit)
                    .offset(pagination.offset),
            ]);

            const entries = await Promise.all(allRows.map(async ({ userId }) => {
                return ({ userId, entry: await findEntry(userId, catalogItemId) })
            }));

            const completeEntries: TEntry[] = [];
            const entriesByUserId = new Map(entries.map(({ userId, entry }) => [userId, entry]));

            for (const { entry } of entries) {
                if (entry !== undefined) completeEntries.push(entry as TEntry);
            }

            const items = await Promise.all(pageRows.map(async (row) => {
                const entry = entriesByUserId.get(row.userId);
                if (!entry) return;
                const userMedia = await toUserMedia(entry, catalogItemId, row.ratingSystem, false);

                return {
                    kind,
                    id: row.userId,
                    name: row.name,
                    image: row.image,
                    ratingSystem: row.ratingSystem,
                    userMedia: { ...userMedia, kind, comment: null },
                };
            }));

            const ratings = allRows
                .map(({ rating }) => rating)
                .filter((rating): rating is number => rating !== null);
            const contributions = completeEntries.map(getContribution);
            const total = allRows.length;

            return {
                kind,
                page: pagination.page,
                items: items.filter((item): item is NonNullable<typeof item> => item !== undefined),
                total,
                perPage: pagination.perPage,
                pages: Math.ceil(total / pagination.perPage),
                stats: {
                    total,
                    totalRedo: contributions.reduce((sum, contribution) => sum + contribution.redo, 0),
                    likedCount: allRows.filter(({ favorite }) => favorite).length,
                    totalSpecific: contributions.reduce((sum, contribution) => sum + contribution.specific, 0),
                    totalPlaytime: contributions.reduce((sum, contribution) => sum + contribution.playtime, 0),
                    completedCount: allRows.filter(({ status }) => status === Status.COMPLETED).length,
                    averageRating: ratings.length > 0
                        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
                        : null,
                },
            };
        },

        async findLibraryEntriesByCatalogItem(catalogItemId: number) {
            const owners = await getDbClient()
                .select({ userId: libraryEntry.userId })
                .from(libraryEntry)
                .where(eq(libraryEntry.catalogItemId, catalogItemId));

            const entries = await Promise.all(owners.map(({ userId }) => {
                return findEntry(userId, catalogItemId);
            }));

            return entries.filter((entry): entry is Exclude<typeof entry, undefined> => entry !== undefined);
        },

        async getUserMediaHistory(userId: number, catalogItemId: number) {
            const rows = await getDbClient()
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

            return rows;
        },

        async getListHeader(userId: number) {
            const channel = getDbClient()
                .select({ enabled: profileMediaChannel.enabled })
                .from(profileMediaChannel)
                .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.kind, kind)))
                .get();

            if (!channel?.enabled) return;

            const stats = await getStats(userId);

            return { timeSpent: stats?.timeSpentMinutes ?? 0 };
        },

        async getTagsView(ownerId: number, search: SimpleSearch) {
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
                items,
                exactMatch,
                total: tagRows.length,
                page: pagination.page,
                perPage: pagination.perPage,
                pages: Math.ceil(tagRows.length / pagination.perPage),
            };
        },

        async getTagNames(userId: number) {
            return getDbClient()
                .select({ name: libraryTag.name })
                .from(libraryTag)
                .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, kind)))
                .orderBy(asc(libraryTag.name));
        },

        async synchronizeProfileChannel(userId: number, enabled: boolean, views: number) {
            await getDbClient()
                .insert(profileMediaChannel)
                .values({
                    userId,
                    kind: kind,
                    enabled, views: Math.max(0, views),
                })
                .onConflictDoUpdate({
                    target: [profileMediaChannel.userId, profileMediaChannel.kind],
                    set: { enabled, views: Math.max(0, views) },
                });
        },

        async editTag(params: { userId: number; mediaId?: number; action: TagAction; tag: { name: string; oldName?: string } }) {
            const libraryEntryId = params.mediaId ? (await findCommonEntry(params.userId, params.mediaId))?.id : undefined;

            if (params.action === TagAction.ADD) {
                const [tag] = await getDbClient()
                    .insert(libraryTag)
                    .values({
                        kind: kind,
                        name: params.tag.name,
                        userId: params.userId,
                    }).onConflictDoUpdate({
                        target: [libraryTag.userId, libraryTag.kind, libraryTag.name],
                        set: { name: sql`excluded.name` },
                    }).returning({ id: libraryTag.id });

                if (libraryEntryId) {
                    await getDbClient()
                        .insert(libraryEntryTag)
                        .values({ tagId: tag.id, libraryEntryId: libraryEntryId })
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
                    eq(libraryTag.name, oldName),
                    eq(libraryTag.userId, params.userId),
                )).get();

            if (!currentTag) return;

            if (params.action === TagAction.RENAME) {
                const collision = getDbClient()
                    .select({ id: libraryTag.id })
                    .from(libraryTag)
                    .where(and(
                        eq(libraryTag.kind, kind),
                        eq(libraryTag.userId, params.userId),
                        eq(libraryTag.name, params.tag.name),
                    )).get();

                if (collision) throw new FormattedError("A tag with this name already exists.");

                await getDbClient()
                    .update(libraryTag)
                    .set({ name: params.tag.name })
                    .where(eq(libraryTag.id, currentTag.id));

                return { name: params.tag.name };
            }

            if (params.action === TagAction.DELETE_ALL) {
                await getDbClient()
                    .delete(libraryTag)
                    .where(eq(libraryTag.id, currentTag.id));
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
        },

        async updateCustomCover(userId: number, input: UpdateUserCustomCover) {
            const current = await requireEntry(userId, input.mediaId);
            const customCover = await prepareCustomCover(input);

            return updateExistingEntry(current, { customCover });
        },

        async recordCreatedEntry(params: { entryId: number; snapshot: LibraryStatsSnapshot; activity: LibraryActivityContribution }) {
            await applyStatsTransition(undefined, params.snapshot);
            await recordChange(params.entryId, UpdateType.STATUS, null, params.snapshot.status);
            await recordActivity(params.entryId, params.activity);
        },

        async recordEntryTransition(params: {
            entryId: number;
            loggedAt?: string;
            updateType: UpdateType;
            after: LibraryStatsSnapshot;
            before: LibraryStatsSnapshot;
            oldValue: LibraryChangeValue;
            newValue: LibraryChangeValue;
            activity: LibraryActivityContribution;
        }) {
            await applyStatsTransition(params.before, params.after);
            await recordActivity(params.entryId, params.activity, params.loggedAt);
            await recordChange(params.entryId, params.updateType, params.oldValue, params.newValue, params.loggedAt);
        },

        async removeEntry(entryId: number, snapshot: LibraryStatsSnapshot) {
            await applyStatsTransition(snapshot, undefined);
            await executeRemoveEntry(entryId);
        },

        async getLibraryListItemRelations(entryIds: number[], catalogItemIds: number[], currentUserId: number | undefined, ownerId: number) {
            const [tags, commonEntries] = await Promise.all([
                getDbClient()
                    .select({
                        libraryEntryId: libraryEntryTag.libraryEntryId,
                        id: libraryTag.id,
                        name: libraryTag.name,
                    })
                    .from(libraryEntryTag)
                    .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                    .where(inArray(libraryEntryTag.libraryEntryId, entryIds))
                    .orderBy(asc(libraryTag.name)),
                currentUserId && currentUserId !== ownerId
                    ? getDbClient()
                        .select({ catalogItemId: libraryEntry.catalogItemId })
                        .from(libraryEntry)
                        .where(and(
                            eq(libraryEntry.userId, currentUserId),
                            inArray(libraryEntry.catalogItemId, catalogItemIds),
                        ))
                    : [],
            ]);

            return {
                tags,
                commonIds: new Set(commonEntries.map(({ catalogItemId }) => catalogItemId)),
            };
        },

        async createEntry(params: typeof libraryEntry.$inferInsert) {
            const [entry] = await getDbClient()
                .insert(libraryEntry)
                .values(params)
                .returning({ id: libraryEntry.id });

            return entry.id;
        },

        getCommonLibraryListConditions(currentUserId: number | undefined, ownerId: number, args: CommonLibraryListArgs) {
            const conditions: SQL[] = [eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, kind)];

            if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
            if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
            if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
            if (args.status?.length) conditions.push(inArray(libraryEntry.status, [...args.status]));
            if (args.tags?.length) {
                conditions.push(inArray(
                    libraryEntry.id,
                    getDbClient()
                        .select({ libraryEntryId: libraryEntryTag.libraryEntryId })
                        .from(libraryEntryTag)
                        .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                        .where(inArray(libraryTag.name, [...args.tags])),
                ));
            }
            if (args.genres?.length) {
                conditions.push(inArray(
                    catalogItem.id,
                    getDbClient()
                        .select({ catalogItemId: catalogItemGenre.catalogItemId })
                        .from(catalogItemGenre)
                        .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                        .where(inArray(catalogGenre.name, [...args.genres])),
                ));
            }
            if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
                const currentEntry = alias(libraryEntry, "current_viewer_library_entry");
                conditions.push(notInArray(
                    catalogItem.id,
                    getDbClient()
                        .select({ catalogItemId: currentEntry.catalogItemId })
                        .from(currentEntry)
                        .where(eq(currentEntry.userId, currentUserId)),
                ));
            }

            return conditions;
        },

        updateRating(params: { userId: number; catalogItemId: number; rating: number | null }) {
            if (params.rating !== null && (params.rating < 0 || params.rating > 10)) {
                throw new FormattedError("Rating must be between 0 and 10.");
            }
            return updateFields(params, { rating: params.rating });
        },

        updateComment(params: { userId: number; catalogItemId: number; comment: string | null }) {
            return updateFields(params, { comment: params.comment });
        },

        updateFavorite(params: { userId: number; catalogItemId: number; favorite: boolean }) {
            return updateFields(params, { favorite: params.favorite });
        },

        applyStatsTransition,

        updateEntry,
    }
}
