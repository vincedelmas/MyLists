import {and, count, eq, getTableColumns, sql} from "drizzle-orm";
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
    tvDetails,
    tvProgress,
    tvSeason,
    tvSeasonRewatch,
} from "@/lib/server/database/schema";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {TvProgressState, TvSeasonDefinition} from "@/lib/server/domain/library/tv/tv-progress";
import {LibraryChangeValue} from "@/lib/server/database/schema/library.schema";


export type TvLibraryEntry = {
    id: number;
    userId: number;
    catalogItemId: number;
    kind: typeof MediaType.SERIES | typeof MediaType.ANIME;
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

export class TvLibraryRepository {
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

        if (!row || (row.kind !== MediaType.SERIES && row.kind !== MediaType.ANIME)) return;

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

        if (!row || (row.kind !== MediaType.SERIES && row.kind !== MediaType.ANIME)) return;
        return row as typeof row & { kind: typeof MediaType.SERIES | typeof MediaType.ANIME };
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
        kind: typeof MediaType.SERIES | typeof MediaType.ANIME;
        action: TagAction;
        name: string;
        oldName?: string;
        libraryEntryId?: number;
    }) {
        if (params.action === TagAction.ADD) {
            const [tag] = await getDbClient()
                .insert(libraryTag)
                .values({ userId: params.userId, kind: params.kind, name: params.name })
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
                eq(libraryTag.kind, params.kind),
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
                    eq(libraryTag.kind, params.kind),
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

    async getStats(userId: number, kind: MediaType) {
        return getDbClient()
            .select()
            .from(libraryStats)
            .where(and(eq(libraryStats.userId, userId), eq(libraryStats.kind, kind)))
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

    async synchronizeProfileChannel(userId: number, kind: TvLibraryEntry["kind"], enabled: boolean, views: number) {
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
}
