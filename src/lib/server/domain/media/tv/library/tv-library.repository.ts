import {and, count, eq, getTableColumns, sql, asc, desc, gte, inArray, isNotNull, like, max, notInArray, SQL} from "drizzle-orm";
import {getDbClient} from "@/lib/server/database/async-storage";
import {catalogItem, libraryEntry, tvDetails, tvProgress, tvSeason, tvSeasonRewatch, user, tvActor, tvNetwork} from "@/lib/server/database/schema";
import {Status, JobType} from "@/lib/utils/enums";
import {TvProgressState, TvSeasonDefinition, consumedEpisodeCount, totalTvRewatchCount} from "@/lib/server/domain/media/tv/library/tv-progress";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {SearchType} from "@/lib/schemas";
import {getImageUrl} from "@/lib/utils/image-url";
import {resolvePagination, resolveSorting} from "@/lib/server/database/pagination";
import {TvCommunityActivityPage} from "@/lib/contracts/media/community";
import {TvListArgs, TvListPage} from "@/lib/contracts/media/lists";
import {MediaListAccessScope} from "@/lib/server/domain/access/library-access.policy";
import {getLibraryCommunityActivity} from "@/lib/server/domain/media/shared/library/library-community-activity";
import {
    findFollowedUsersLibraryMedia,
    findLibraryEntriesByCatalogItem,
    findLibraryUserMedia,
    getCommonLibraryListConditions,
    getLibraryEntryTags,
    getLibraryGenresAndTags,
    getLibraryListItemRelations,
} from "@/lib/server/domain/media/shared/library/library-shared-queries";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";

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
    constructor(
        private readonly kind: K,
        private readonly common = new CommonLibraryRepository(kind),
    ) {
    }

    async findEntriesByCatalogItem(catalogItemId: number) {
        return findLibraryEntriesByCatalogItem(
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
        );
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
        const entryId = await this.common.createEntry({
            userId: params.userId,
            catalogItemId: params.catalogItemId,
            status: params.status,
            favorite: params.favorite ?? false,
            comment: params.comment,
            rating: params.rating,
            customCover: params.customCover,
            addedAt: params.addedAt,
            updatedAt: params.updatedAt,
        });

        await getDbClient().insert(tvProgress).values({
            libraryEntryId: entryId,
            currentSeason: params.progress.currentSeason,
            currentEpisode: params.progress.currentEpisode,
            watchedEpisodes: params.progress.watchedEpisodes,
        });
        await this.replaceRewatches(entryId, params.catalogItemId, params.progress.rewatches);

        return entryId;
    }

    async saveProgress(entry: Pick<TvLibraryEntry, "id" | "catalogItemId">, state: TvProgressState) {
        await this.common.updateEntry(entry.id, { status: state.status });
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



    async findUserMedia(userId: number | undefined, catalogItemId: number) {
        return findLibraryUserMedia(
            userId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async findFollowedUsersMedia(viewerId: number | undefined, catalogItemId: number) {
        return findFollowedUsersLibraryMedia(
            this.kind,
            viewerId,
            catalogItemId,
            (ownerId, mediaId) => this.findEntry(ownerId, mediaId),
            (entry, mediaId, ratingSystem, includeTags) => this.toUserMedia(entry, mediaId, ratingSystem, includeTags),
        );
    }

    async getCommunityActivity(viewerId: number | undefined, catalogItemId: number, search: SearchType): Promise<TvCommunityActivityPage<K>> {
        return getLibraryCommunityActivity({
            kind: this.kind,
            viewerId,
            catalogItemId,
            search,
            findEntry: (userId, mediaId) => this.findEntry(userId, mediaId),
            toUserMedia: (entry, mediaId, ratingSystem) => this.toUserMedia(entry, mediaId, ratingSystem, false),
            getContribution: (entry) => ({
                redo: totalTvRewatchCount(entry.progress),
                specific: consumedEpisodeCount(entry.progress, entry.seasons),
                playtime: 0,
            }),
        });
    }

    private async toUserMedia(
        entry: TvLibraryEntry,
        catalogItemId: number,
        ratingSystem: typeof user.$inferSelect.ratingSystem,
        includeTags: boolean,
    ) {
        const tags = includeTags ? await getLibraryEntryTags(entry.id) : undefined;

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
        const [{ genres, tags }, langs] = await Promise.all([
            getLibraryGenresAndTags(this.kind, ownerId),
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
        const conditions = getCommonLibraryListConditions(this.kind, currentUserId, ownerId, args);
        if (args.langs?.length) conditions.push(inArray(tvDetails.originCountry, args.langs));
        if (args.creators?.length) conditions.push(inArray(tvDetails.createdBy, args.creators));
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

        const [seasons, rewatches, { tags, commonIds }] = await Promise.all([
            getDbClient().select().from(tvSeason).where(inArray(tvSeason.catalogItemId, catalogItemIds)).orderBy(tvSeason.seasonNumber),
            getDbClient().select().from(tvSeasonRewatch).where(inArray(tvSeasonRewatch.libraryEntryId, entryIds)).orderBy(tvSeasonRewatch.seasonNumber),
            getLibraryListItemRelations(entryIds, catalogItemIds, currentUserId, ownerId),
        ]);

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
