import {and, count, eq, getTableColumns, sql, asc, desc, ne, gte, inArray, isNotNull, like, max, notInArray, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryActivity, libraryChange, libraryEntry, libraryEntryTag, libraryStats, libraryTag, profileMediaChannel, tvDetails, tvProgress, tvSeason, tvSeasonRewatch, followers, user, catalogGenre, catalogItemGenre, tvActor, tvNetwork} from "@/lib/server/database/schema";
import {Status, TagAction, UpdateType, PrivacyType, SocialState, JobType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {TvProgressState, TvSeasonDefinition, consumedEpisodeCount, totalTvRewatchCount} from "@/lib/server/domain/media/tv/library/tv-progress";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {SearchType, SimpleSearch} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {TvCommunityActivityPage} from "@/lib/contracts/media/community";
import {alias} from "drizzle-orm/sqlite-core";
import {TvListArgs, TvListPage} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";

export type TvLibraryEntry = {
    id: number;
    userId: number;
    catalogItemId: number;
    kind: TvMediaType;
    name: string;
    episodeDurationMinutes: number;
    favorite: boolean;
    comment: string | null;
    rating: number | null;
    customCover: string | null;
    addedAt: string | null;
    updatedAt: string | null;
    progress: TvProgressState;
    seasons: TvSeasonDefinition[];
};

export const TV_LIST_SORTS = [
    "Title A-Z",
    "Title Z-A",
    "Release Date +",
    "Release Date -",
    "TMDB Rating +",
    "TMDB Rating -",
    "Recently Added",
    "Recently Modified",
    "Rating +",
    "Rating -",
    "Re-watched",
] as const;


/** Concrete series/anime list query; no generic media repository inheritance. */

export class TvLibraryRepository<K extends TvMediaType = TvMediaType> {
    constructor(private readonly kind: K) {}

    async findEntriesByCatalogItem(catalogItemId: number) {
        const owners = await getDbClient()
            .select({ userId: libraryEntry.userId })
            .from(libraryEntry)
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(eq(libraryEntry.catalogItemId, catalogItemId));

        const entries = await Promise.all(owners.map(({ userId }) => this.findEntry(userId, catalogItemId)));
        return entries.filter((entry): entry is TvLibraryEntry => !!entry);
    }

    async findEntry(userId: number, catalogItemId: number): Promise<TvLibraryEntry | undefined> {
        const row = await getDbClient()
            .select({
                ...getTableColumns(libraryEntry),
                kind: catalogItem.kind,
                name: catalogItem.name,
                episodeDurationMinutes: tvDetails.episodeDurationMinutes,
                currentSeason: tvProgress.currentSeason,
                currentEpisode: tvProgress.currentEpisode,
                watchedEpisodes: tvProgress.watchedEpisodes,
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(libraryEntry.userId, userId), eq(libraryEntry.catalogItemId, catalogItemId)))
            .get();

        if (!row || row.kind !== this.kind) return;

        const [seasons, rewatches] = await Promise.all([
            this.getSeasons(catalogItemId),
            getDbClient()
                .select({ seasonNumber: tvSeasonRewatch.seasonNumber, count: tvSeasonRewatch.count })
                .from(tvSeasonRewatch)
                .where(eq(tvSeasonRewatch.libraryEntryId, row.id))
                .orderBy(tvSeasonRewatch.seasonNumber),
        ]);

        return {
            id: row.id,
            userId: row.userId,
            catalogItemId: row.catalogItemId,
            kind: row.kind,
            name: row.name,
            episodeDurationMinutes: row.episodeDurationMinutes,
            favorite: row.favorite,
            comment: row.comment,
            rating: row.rating,
            customCover: row.customCover,
            addedAt: row.addedAt,
            updatedAt: row.updatedAt,
            seasons,
            progress: {
                status: row.status,
                currentSeason: row.currentSeason,
                currentEpisode: row.currentEpisode,
                watchedEpisodes: row.watchedEpisodes,
                rewatches,
            },
        };
    }

    async getTvCatalogItem(catalogItemId: number) {
        const row = await getDbClient()
            .select({
                id: catalogItem.id,
                kind: catalogItem.kind,
                name: catalogItem.name,
                episodeDurationMinutes: tvDetails.episodeDurationMinutes,
            })
            .from(catalogItem)
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(eq(catalogItem.id, catalogItemId))
            .get();

        if (!row || row.kind !== this.kind) return;
        return row as typeof row & { kind: K };
    }

    async getSeasons(catalogItemId: number): Promise<TvSeasonDefinition[]> {
        return getDbClient()
            .select({ seasonNumber: tvSeason.seasonNumber, episodeCount: tvSeason.episodeCount })
            .from(tvSeason)
            .where(eq(tvSeason.catalogItemId, catalogItemId))
            .orderBy(tvSeason.seasonNumber);
    }

    async createEntry(params: {
        userId: number;
        catalogItemId: number;
        status: Status;
        progress: TvProgressState;
        favorite?: boolean | null;
        comment?: string | null;
        rating?: number | null;
        customCover?: string | null;
        addedAt?: string | null;
        updatedAt?: string | null;
    }) {
        const [entry] = await getDbClient()
            .insert(libraryEntry)
            .values({
                userId: params.userId,
                catalogItemId: params.catalogItemId,
                status: params.status,
                favorite: params.favorite ?? false,
                comment: params.comment,
                rating: params.rating,
                customCover: params.customCover,
                addedAt: params.addedAt,
                updatedAt: params.updatedAt,
            })
            .returning({ id: libraryEntry.id });

        await getDbClient().insert(tvProgress).values({
            libraryEntryId: entry.id,
            currentSeason: params.progress.currentSeason,
            currentEpisode: params.progress.currentEpisode,
            watchedEpisodes: params.progress.watchedEpisodes,
        });
        await this.replaceRewatches(entry.id, params.catalogItemId, params.progress.rewatches);

        return entry.id;
    }

    async saveProgress(entry: Pick<TvLibraryEntry, "id" | "catalogItemId">, state: TvProgressState) {
        await getDbClient()
            .update(libraryEntry)
            .set({ status: state.status, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(libraryEntry.id, entry.id));
        await getDbClient()
            .update(tvProgress)
            .set({
                currentSeason: state.currentSeason,
                currentEpisode: state.currentEpisode,
                watchedEpisodes: state.watchedEpisodes,
            })
            .where(eq(tvProgress.libraryEntryId, entry.id));
        await this.replaceRewatches(entry.id, entry.catalogItemId, state.rewatches);
    }

    async updateCommonFields(
        entryId: number,
        fields: Partial<Pick<typeof libraryEntry.$inferInsert, "rating" | "comment" | "favorite" | "customCover">>,
    ) {
        await getDbClient()
            .update(libraryEntry)
            .set({ ...fields, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(libraryEntry.id, entryId));
    }

    async removeEntry(entryId: number) {
        await getDbClient().delete(libraryEntry).where(eq(libraryEntry.id, entryId));
    }

    async editTag(params: {
        userId: number;
        action: TagAction;
        name: string;
        oldName?: string;
        libraryEntryId?: number;
    }) {
        if (params.action === TagAction.ADD) {
            const [tag] = await getDbClient()
                .insert(libraryTag)
                .values({ userId: params.userId, kind: this.kind, name: params.name })
                .onConflictDoUpdate({
                    target: [libraryTag.userId, libraryTag.kind, libraryTag.name],
                    set: { name: sql`excluded.name` },
                })
                .returning({ id: libraryTag.id });
            if (params.libraryEntryId) {
                await getDbClient()
                    .insert(libraryEntryTag)
                    .values({ libraryEntryId: params.libraryEntryId, tagId: tag.id })
                    .onConflictDoNothing();
            }
            return { name: params.name };
        }

        const currentTag = await getDbClient()
            .select({ id: libraryTag.id })
            .from(libraryTag)
            .where(and(
                eq(libraryTag.userId, params.userId),
                eq(libraryTag.kind, this.kind),
                eq(libraryTag.name, params.action === TagAction.RENAME ? params.oldName! : params.name),
            ))
            .get();
        if (!currentTag) return;

        if (params.action === TagAction.RENAME) {
            if (!params.oldName) return;
            const collision = await getDbClient()
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
            await getDbClient().delete(libraryEntryTag).where(and(
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

    async getStats(userId: number) {
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

    async recordChange(entryId: number, updateType: UpdateType, oldValue: LibraryChangeValue, newValue: LibraryChangeValue, occurredAt?: string) {
        const [change] = await getDbClient().insert(libraryChange).values({
            libraryEntryId: entryId,
            updateType,
            payload: { oldValue, newValue },
            occurredAt: occurredAt ?? sql`CURRENT_TIMESTAMP`,
        }).returning({ id: libraryChange.id });
        return change.id;
    }

    async synchronizeProfileChannel(userId: number, enabled: boolean, views: number) {
        await getDbClient().insert(profileMediaChannel).values({
            userId,
            kind: this.kind,
            enabled,
            views: Math.max(0, views),
        }).onConflictDoUpdate({
            target: [profileMediaChannel.userId, profileMediaChannel.kind],
            set: { enabled, views: Math.max(0, views) },
        });
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
            await getDbClient()
                .insert(libraryActivity)
                .values({
                    ...identity,
                    libraryEntryId: params.entryId,
                    unitsGained: params.unitsGained,
                    completed: params.completed,
                    redo: params.redo,
                    monthBucket: params.monthBucket,
                    lastUpdatedAt: params.occurredAt,
                })
                .onConflictDoUpdate({
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
            await getDbClient()
                .update(libraryActivity)
                .set({
                    completed: sql`${libraryActivity.completed} OR ${params.completed}`,
                    redo: sql`${libraryActivity.redo} OR ${params.redo}`,
                    lastUpdatedAt: params.occurredAt,
                })
                .where(and(
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

    private async replaceRewatches(
        libraryEntryId: number,
        catalogItemId: number,
        rewatches: TvProgressState["rewatches"],
    ) {
        await getDbClient().delete(tvSeasonRewatch).where(eq(tvSeasonRewatch.libraryEntryId, libraryEntryId));
        if (rewatches.length === 0) return;

        await getDbClient().insert(tvSeasonRewatch).values(rewatches.map((rewatch) => ({
            libraryEntryId,
            catalogItemId,
            seasonNumber: rewatch.seasonNumber,
            count: rewatch.count,
        })));
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

        return rows.map((row) => ({
            ...row,
            id: row.id,
            payload: row.payload,
        }));
    }

    async findUserMedia(userId: number | undefined, catalogItemId: number) {
        if (!userId) return null;

        const [entry, owner] = await Promise.all([
            this.findEntry(userId, catalogItemId),
            getDbClient()
                .select({ ratingSystem: user.ratingSystem })
                .from(user)
                .where(eq(user.id, userId))
                .get(),
        ]);
        if (!entry || !owner) return null;

        return this.toUserMedia(entry, catalogItemId, owner.ratingSystem, true);
    }

    async findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
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
                eq(profileMediaChannel.userId, followers.followedId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(and(
                eq(followers.followerId, viewerId),
                eq(followers.status, SocialState.ACCEPTED),
            ))
            .orderBy(asc(user.name));

        const results = await Promise.all(followedOwners.map(async (owner) => {
            const entry = await this.findEntry(owner.id, catalogItemId);
            if (!entry) return;
            return {
                ...owner,
                userMedia: await this.toUserMedia(entry, catalogItemId, owner.ratingSystem, false),
            };
        }));
        return results.filter((result): result is NonNullable<typeof result> => !!result);
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<TvCommunityActivityPage<K>> {
        const pagination = resolvePagination({
            page: search.page,
            perPage: search.perPage,
            defaultPerPage: 8,
            maxPerPage: 50,
        });

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
        const visibleConditions = and(
            eq(libraryEntry.catalogItemId, catalogItemId),
            ne(user.name, "DemoProfile"),
            audienceCondition,
        );
        const baseSelection = {
            entryId: libraryEntry.id,
            userId: user.id,
            name: user.name,
            image: user.image,
            ratingSystem: user.ratingSystem,
            favorite: libraryEntry.favorite,
            rating: libraryEntry.rating,
            status: libraryEntry.status,
        };
        const baseQuery = () => getDbClient()
            .select(baseSelection)
            .from(libraryEntry)
            .innerJoin(user, eq(user.id, libraryEntry.userId))
            .innerJoin(profileMediaChannel, and(
                eq(profileMediaChannel.userId, libraryEntry.userId),
                eq(profileMediaChannel.kind, this.kind),
                eq(profileMediaChannel.enabled, true),
            ))
            .where(visibleConditions);
        const [allRows, pageRows] = await Promise.all([
            baseQuery(),
            baseQuery()
                .orderBy(desc(sql`COALESCE(${libraryEntry.updatedAt}, ${libraryEntry.addedAt})`))
                .limit(pagination.limit)
                .offset(pagination.offset),
        ]);

        const entries = await Promise.all(allRows.map(({ userId }) => this.findEntry(userId, catalogItemId)));
        const completeEntries = entries.filter((entry): entry is TvLibraryEntry => !!entry);
        const totalSpecific = completeEntries.reduce(
            (total, entry) => total + consumedEpisodeCount(entry.progress, entry.seasons),
            0,
        );
        const totalRedo = completeEntries.reduce((total, entry) => total + totalTvRewatchCount(entry.progress), 0);
        const ratings = allRows.map(({ rating }) => rating).filter((rating): rating is number => rating !== null);
        const items = await Promise.all(pageRows.map(async (row) => {
            const entry = await this.findEntry(row.userId, catalogItemId);
            if (!entry) return;
            const userMedia = await this.toUserMedia(entry, catalogItemId, row.ratingSystem, false);
            return {
                kind: this.kind,
                id: row.userId,
                name: row.name,
                image: row.image,
                ratingSystem: row.ratingSystem,
                userMedia: { ...userMedia, kind: this.kind, comment: null },
            };
        }));
        const total = allRows.length;

        return {
            kind: this.kind,
            page: pagination.page,
            items: items.filter((item): item is NonNullable<typeof item> => !!item),
            total,
            perPage: pagination.perPage,
            pages: Math.ceil(total / pagination.perPage),
            stats: {
                total,
                totalRedo,
                likedCount: allRows.filter(({ favorite }) => favorite).length,
                totalSpecific,
                totalPlaytime: 0,
                completedCount: allRows.filter(({ status }) => status === Status.COMPLETED).length,
                averageRating: ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
            },
        };
    }

    private async toUserMedia(
        entry: TvLibraryEntry,
        catalogItemId: number,
        ratingSystem: typeof user.$inferSelect.ratingSystem,
        includeTags: boolean,
    ) {
        const tags = includeTags
            ? await getDbClient()
                .select({ name: libraryTag.name })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(eq(libraryEntryTag.libraryEntryId, entry.id))
                .orderBy(asc(libraryTag.name))
            : undefined;

        const userMedia = {
            id: entry.id,
            userId: entry.userId,
            mediaId: catalogItemId,
            status: entry.progress.status,
            favorite: entry.favorite,
            comment: entry.comment,
            rating: entry.rating,
            customCover: entry.customCover ? getImageUrl(`${this.kind}-covers`, entry.customCover) : null,
            addedAt: entry.addedAt,
            lastUpdated: entry.updatedAt,
            currentSeason: entry.progress.currentSeason,
            currentEpisode: entry.progress.currentEpisode,
            watchedEpisodes: entry.progress.watchedEpisodes,
            rewatches: entry.progress.rewatches,
        };

        return { ...userMedia, ratingSystem, tags: tags ?? [] };
    }



    async getListHeader(userId: number) {
        const channel = await getDbClient()
            .select({ enabled: profileMediaChannel.enabled })
            .from(profileMediaChannel)
            .where(and(eq(profileMediaChannel.userId, userId), eq(profileMediaChannel.kind, this.kind)))
            .get();
        if (!channel?.enabled) return;
        const stats = await getDbClient()
            .select({ timeSpent: libraryStats.timeSpentMinutes })
            .from(libraryStats)
            .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, this.kind)))
            .get();
        return { timeSpent: stats?.timeSpent ?? 0 };
    }

    async getMediaList(currentUserId: number | undefined, access: MediaListAccessScope, args: TvListArgs): Promise<TvListPage<K>> {
        const ownerId = access.ownerId;
        const { page, perPage, offset, limit } = resolvePagination(args);
        const sorting = resolveSorting(args.sorting, TV_LIST_SORTS, "Title A-Z");
        const conditions = this.buildConditions(currentUserId, ownerId, args);
        const rewatchCount = sql<number>`(
            SELECT COALESCE(SUM(rewatch.count), 0)
            FROM ${tvSeasonRewatch} rewatch
            WHERE rewatch.library_entry_id = ${libraryEntry.id}
        )`;

        const query = getDbClient()
            .select({
                catalogItemId: catalogItem.id,
                id: libraryEntry.id,
                userId: libraryEntry.userId,
                mediaId: catalogItem.id,
                status: libraryEntry.status,
                favorite: libraryEntry.favorite,
                comment: libraryEntry.comment,
                rating: libraryEntry.rating,
                customCover: libraryEntry.customCover,
                addedAt: libraryEntry.addedAt,
                lastUpdated: libraryEntry.updatedAt,
                currentSeason: tvProgress.currentSeason,
                currentEpisode: tvProgress.currentEpisode,
                watchedEpisodes: tvProgress.watchedEpisodes,
                mediaName: catalogItem.name,
                imageCover: catalogItem.imageCover,
                ratingSystem: user.ratingSystem,
            })
            .from(libraryEntry)
            .innerJoin(user, eq(user.id, libraryEntry.userId))
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(and(...conditions))
            .orderBy(...this.sortExpressions(sorting, rewatchCount))
            .limit(limit)
            .offset(offset);

        const totalQuery = getDbClient()
            .select({ value: count() })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .innerJoin(tvProgress, eq(tvProgress.libraryEntryId, libraryEntry.id))
            .where(and(...conditions))
            .get();

        const [rows, totalRow] = await Promise.all([query, totalQuery]);
        const items = await this.hydrateItems(rows, currentUserId, ownerId);
        const totalItems = totalRow?.value ?? 0;

        return {
            kind: this.kind,
            items,
            pagination: {
                page,
                perPage,
                totalPages: Math.ceil(totalItems / perPage),
                totalItems,
                sorting,
                availableSorting: [...TV_LIST_SORTS],
            },
        };
    }

    async getListFilters(access: MediaListAccessScope) {
        const ownerId = access.ownerId;
        const [genres, tags, langs] = await Promise.all([
            getDbClient()
                .selectDistinct({ name: catalogGenre.name })
                .from(libraryEntry)
                .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, libraryEntry.catalogItemId))
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(eq(libraryEntry.userId, ownerId), eq(catalogItem.kind, this.kind)))
                .orderBy(asc(catalogGenre.name)),
            getDbClient()
                .select({ name: libraryTag.name })
                .from(libraryTag)
                .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, this.kind)))
                .orderBy(asc(libraryTag.name)),
            getDbClient()
                .selectDistinct({ name: tvDetails.originCountry })
                .from(libraryEntry)
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, this.kind),
                    isNotNull(tvDetails.originCountry),
                ))
                .orderBy(asc(tvDetails.originCountry)),
        ]);

        return { kind: this.kind, genres, tags, langs: langs as { name: string }[] };
    }

    async getSearchListFilters(access: MediaListAccessScope, query: string, job: JobType) {
        const ownerId = access.ownerId;
        if (job === JobType.ACTOR) {
            return getDbClient()
                .selectDistinct({ name: tvActor.name })
                .from(tvActor)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, tvActor.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, this.kind),
                    like(tvActor.name, `%${query}%`),
                ));
        }
        if (job === JobType.PLATFORM) {
            return getDbClient()
                .selectDistinct({ name: tvNetwork.name })
                .from(tvNetwork)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, tvNetwork.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, this.kind),
                    like(tvNetwork.name, `%${query}%`),
                ));
        }
        if (job === JobType.CREATOR) {
            const rows = await getDbClient()
                .selectDistinct({ name: tvDetails.createdBy })
                .from(tvDetails)
                .innerJoin(libraryEntry, eq(libraryEntry.catalogItemId, tvDetails.catalogItemId))
                .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
                .where(and(
                    eq(libraryEntry.userId, ownerId),
                    eq(catalogItem.kind, this.kind),
                    like(tvDetails.createdBy, `%${query}%`),
                ));
            return Array.from(new Set(rows
                .flatMap(({ name }) => name?.split(",") ?? [])
                .map((name) => name.trim())
                .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
                .filter(Boolean)))
                .map((name) => ({ name }));
        }

        return [];
    }

    async getTagsView(access: MediaListAccessScope, search: SimpleSearch) {
        const ownerId = access.ownerId;
        const pagination = resolvePagination({ page: search.page, perPage: 16, maxPerPage: 16 });
        const searchCondition = search.search ? like(libraryTag.name, `%${search.search}%`) : undefined;
        const tagRows = await getDbClient()
            .select({ id: libraryTag.id, name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, ownerId), eq(libraryTag.kind, this.kind), searchCondition));
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

    getTagNames(userId: number) {
        return getDbClient()
            .select({ name: libraryTag.name })
            .from(libraryTag)
            .where(and(eq(libraryTag.userId, userId), eq(libraryTag.kind, this.kind)))
            .orderBy(asc(libraryTag.name));
    }

    async getUpcomingMedia(access: MediaListAccessScope) {
        const lastEpisode = getDbClient()
            .select({
                catalogItemId: tvSeason.catalogItemId,
                value: max(tvSeason.episodeCount).as("last_episode"),
            })
            .from(tvSeason)
            .groupBy(tvSeason.catalogItemId)
            .as("last_tv_episode");

        return getDbClient()
            .select({
                mediaId: catalogItem.id,
                userId: libraryEntry.userId,
                status: libraryEntry.status,
                mediaName: catalogItem.name,
                lastEpisode: lastEpisode.value,
                date: tvDetails.nextEpisodeAirDate,
                imageCover: catalogItem.imageCover,
                seasonToAir: tvDetails.nextEpisodeSeason,
                episodeToAir: tvDetails.nextEpisodeNumber,
            })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .innerJoin(lastEpisode, eq(lastEpisode.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, this.kind),
                eq(libraryEntry.userId, access.ownerId),
                notInArray(libraryEntry.status, [Status.DROPPED, Status.RANDOM]),
                gte(tvDetails.nextEpisodeAirDate, sql`date('now')`),
            ))
            .orderBy(asc(tvDetails.nextEpisodeAirDate))
            .then((rows) => rows.map(({ imageCover, ...row }) => ({
                ...row,
                imageCover: getImageUrl(`${this.kind}-covers`, imageCover),
            })));
    }

    private buildConditions(currentUserId: number | undefined, ownerId: number, args: TvListArgs) {
        const conditions: SQL[] = [
            eq(libraryEntry.userId, ownerId),
            eq(catalogItem.kind, this.kind),
        ];

        if (args.search) conditions.push(like(catalogItem.name, `%${args.search}%`));
        if (args.favorite) conditions.push(eq(libraryEntry.favorite, true));
        if (args.comment) conditions.push(isNotNull(libraryEntry.comment));
        if (args.status?.length) conditions.push(inArray(libraryEntry.status, args.status));
        if (args.langs?.length) conditions.push(inArray(tvDetails.originCountry, args.langs));
        if (args.creators?.length) conditions.push(inArray(tvDetails.createdBy, args.creators));

        if (args.tags?.length) {
            conditions.push(inArray(libraryEntry.id, getDbClient()
                .select({ libraryEntryId: libraryEntryTag.libraryEntryId })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryTag.name, args.tags))));
        }
        if (args.genres?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: catalogItemGenre.catalogItemId })
                .from(catalogItemGenre)
                .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
                .where(inArray(catalogGenre.name, args.genres))));
        }
        if (args.actors?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: tvActor.catalogItemId })
                .from(tvActor)
                .where(inArray(tvActor.name, args.actors))));
        }
        if (args.networks?.length) {
            conditions.push(inArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: tvNetwork.catalogItemId })
                .from(tvNetwork)
                .where(inArray(tvNetwork.name, args.networks))));
        }
        if (args.hideCommon && currentUserId && currentUserId !== ownerId) {
            const currentEntry = alias(libraryEntry, "current_library_entry");
            conditions.push(notInArray(catalogItem.id, getDbClient()
                .select({ catalogItemId: currentEntry.catalogItemId })
                .from(currentEntry)
                .where(eq(currentEntry.userId, currentUserId))));
        }

        return conditions;
    }

    private sortExpressions(sorting: typeof TV_LIST_SORTS[number], rewatchCount: SQL<number>): SQL[] {
        const name = asc(catalogItem.name);
        const itemId = asc(catalogItem.id);
        const sorts: Record<typeof sorting, SQL[]> = {
            "Title A-Z": [name, itemId],
            "Title Z-A": [desc(catalogItem.name), itemId],
            "Release Date +": [desc(catalogItem.releaseDate), name, itemId],
            "Release Date -": [sql`${catalogItem.releaseDate} ASC NULLS LAST`, name, itemId],
            "TMDB Rating +": [desc(tvDetails.voteAverage), name, itemId],
            "TMDB Rating -": [asc(tvDetails.voteAverage), name, itemId],
            "Recently Added": [desc(libraryEntry.addedAt), name, itemId],
            "Recently Modified": [desc(libraryEntry.updatedAt), name, itemId],
            "Rating +": [desc(libraryEntry.rating), name, itemId],
            "Rating -": [asc(libraryEntry.rating), name, itemId],
            "Re-watched": [desc(rewatchCount), name, itemId],
        };
        return sorts[sorting];
    }

    private async hydrateItems<TRow extends {
        catalogItemId: number;
        id: number;
        watchedEpisodes: number;
        imageCover: string;
        customCover: string | null;
        status: TvProgressState["status"];
        currentSeason: number;
        currentEpisode: number;
    }>(rows: TRow[], currentUserId: number | undefined, ownerId: number) {
        if (rows.length === 0) return [];
        const entryIds = rows.map(({ id }) => id);
        const catalogItemIds = rows.map(({ catalogItemId }) => catalogItemId);

        const [seasons, rewatches, tags, commonEntries] = await Promise.all([
            getDbClient().select().from(tvSeason).where(inArray(tvSeason.catalogItemId, catalogItemIds)).orderBy(tvSeason.seasonNumber),
            getDbClient().select().from(tvSeasonRewatch).where(inArray(tvSeasonRewatch.libraryEntryId, entryIds)).orderBy(tvSeasonRewatch.seasonNumber),
            getDbClient()
                .select({ libraryEntryId: libraryEntryTag.libraryEntryId, id: libraryTag.id, name: libraryTag.name })
                .from(libraryEntryTag)
                .innerJoin(libraryTag, eq(libraryTag.id, libraryEntryTag.tagId))
                .where(inArray(libraryEntryTag.libraryEntryId, entryIds))
                .orderBy(asc(libraryTag.name)),
            currentUserId && currentUserId !== ownerId
                ? getDbClient()
                    .select({ catalogItemId: libraryEntry.catalogItemId })
                    .from(libraryEntry)
                    .where(and(eq(libraryEntry.userId, currentUserId), inArray(libraryEntry.catalogItemId, catalogItemIds)))
                : [],
        ]);
        const commonIds = new Set(commonEntries.map(({ catalogItemId }) => catalogItemId));

        return rows.map(({ catalogItemId, watchedEpisodes, imageCover, customCover, ...row }) => {
            const itemSeasons = seasons
                .filter((season) => season.catalogItemId === catalogItemId)
                .map(({ seasonNumber, episodeCount }) => ({ seasonNumber, episodeCount }));
            const itemRewatches = rewatches
                .filter((rewatch) => rewatch.libraryEntryId === row.id)
                .map(({ seasonNumber, count: rewatchCount }) => ({ seasonNumber, count: rewatchCount }));
            const progress: TvProgressState = {
                status: row.status,
                currentSeason: row.currentSeason,
                currentEpisode: row.currentEpisode,
                watchedEpisodes,
                rewatches: itemRewatches,
            };

            return {
                ...row,
                kind: this.kind,
                customCover: customCover ? getImageUrl(`${this.kind}-covers`, customCover) : null,
                imageCover: getImageUrl(`${this.kind}-covers`, customCover ?? imageCover),
                watchedEpisodes: progress.watchedEpisodes,
                rewatches: progress.rewatches,
                seasons: itemSeasons,
                tags: tags.filter((tag) => tag.libraryEntryId === row.id).map(({ id, name: tagName }) => ({ id, name: tagName })),
                common: commonIds.has(catalogItemId),
            };
        });
    }

}
