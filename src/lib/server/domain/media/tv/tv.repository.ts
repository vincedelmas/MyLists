import {Status} from "@/lib/utils/enums";
import {EpsPerSeasonType} from "@/lib/types/media-list.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {TvType, UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {AnimeDefinition} from "@/lib/server/domain/media/tv/anime/anime.definition";
import {ProviderAttribution} from "@/lib/server/domain/media/base/media-definition";
import {SeriesDefinition} from "@/lib/server/domain/media/tv/series/series.definition";
import {and, asc, count, eq, getTableColumns, gte, inArray, isNotNull, isNull, lte, max, ne, notInArray, or, sql} from "drizzle-orm";


type TvDefinition = AnimeDefinition | SeriesDefinition;


export class TvRepository extends BaseRepository<TvDefinition> {
    private readonly attribution: ProviderAttribution;

    constructor(definition: TvDefinition) {
        super(definition);
        this.attribution = definition.attribution;
    }

    async getMediaEpsPerSeason(mediaId: number) {
        const { epsPerSeasonTable } = this.definition.tables;

        return getDbClient()
            .select({
                season: epsPerSeasonTable.season,
                episodes: epsPerSeasonTable.episodes,
            })
            .from(epsPerSeasonTable)
            .where(eq(epsPerSeasonTable.mediaId, mediaId))
            .orderBy(asc(epsPerSeasonTable.season));
    }

    async getMediaIdsToBeRefreshed(apiIds: number[]) {
        const { mediaTable } = this.definition.tables;
        const staleAfter = `-${this.ingestion.refresh.staleAfterDays} days`;

        const airedCondition = and(
            isNotNull(mediaTable.nextEpisodeToAir),
            lte(mediaTable.nextEpisodeToAir, sql`date('now')`),
        );

        const staleListCondition = apiIds.length > 0
            ? and(inArray(mediaTable.apiId, apiIds), lte(mediaTable.lastApiUpdate, sql`datetime('now', ${staleAfter})`))
            : undefined;

        const refreshCriteria = staleListCondition ? or(staleListCondition, airedCondition) : airedCondition;

        return getDbClient()
            .select({ apiId: mediaTable.apiId })
            .from(mediaTable)
            .where(and(or(eq(mediaTable.lockStatus, false), isNull(mediaTable.lockStatus)), refreshCriteria))
            .then((res) => res.map((m) => m.apiId));
    }

    // --- Advanced Stats  --------------------------------------------------

    async computeTotalSeasons(userId?: number) {
        const { listTable } = this.definition.tables;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const totalSeasons = getDbClient()
            .select({ totalSeasons: sql<number>`coalesce(sum(${listTable.currentSeason}), 0)` })
            .from(listTable)
            .where(and(forUser, ne(listTable.status, Status.PLAN_TO_WATCH)))
            .get();

        return totalSeasons?.totalSeasons ?? 0;
    }

    async avgTvDuration(userId?: number) {
        const { mediaTable, listTable } = this.definition.tables;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const avgDuration = getDbClient()
            .select({
                average: sql<number | null>`AVG(${mediaTable.duration} * ${listTable.total})`
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, notInArray(listTable.status, [Status.RANDOM, Status.PLAN_TO_WATCH])))
            .get();

        return avgDuration?.average ?? null;
    }

    async tvDurationDistrib(userId?: number) {
        const { mediaTable, listTable } = this.definition.tables;
        const forUser = userId ? eq(listTable.userId, userId) : undefined;

        const data = await getDbClient()
            .select({
                name: sql`(floor((${mediaTable.duration} * ${mediaTable.totalEpisodes}) / 600.0) * 600) / 60`.mapWith(String),
                value: count(mediaTable.id).as("count"),
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .where(and(forUser, notInArray(listTable.status, [Status.RANDOM, Status.PLAN_TO_WATCH])))
            .groupBy(sql<number>`floor((${mediaTable.duration} * ${mediaTable.totalEpisodes}) / 600.0) * 600`)
            .orderBy(asc(sql<number>`floor((${mediaTable.duration} * ${mediaTable.totalEpisodes}) / 600.0) * 600`));

        return data;
    }

    // --- Implemented Methods ------------------------------------------------

    async getUpcomingMedia(userId?: number, maxAWeek?: boolean) {
        const { mediaTable, listTable, epsPerSeasonTable } = this.definition.tables;

        const epsSubq = getDbClient()
            .select({
                mediaId: epsPerSeasonTable.mediaId,
                maxSeason: max(epsPerSeasonTable.season).as("maxSeason"),
                lastEpisode: max(epsPerSeasonTable.episodes).as("lastEpisode"),
            }).from(epsPerSeasonTable)
            .groupBy(epsPerSeasonTable.mediaId)
            .as("epsSubq");

        return getDbClient()
            .select({
                mediaId: mediaTable.id,
                userId: listTable.userId,
                status: listTable.status,
                mediaName: mediaTable.name,
                lastEpisode: epsSubq.lastEpisode,
                date: mediaTable.nextEpisodeToAir,
                imageCover: mediaTable.imageCover,
                seasonToAir: mediaTable.seasonToAir,
                episodeToAir: mediaTable.episodeToAir,
            })
            .from(mediaTable)
            .innerJoin(listTable, eq(listTable.mediaId, mediaTable.id))
            .innerJoin(epsSubq, eq(mediaTable.id, epsSubq.mediaId))
            .where(and(
                userId ? eq(listTable.userId, userId) : undefined,
                notInArray(listTable.status, [Status.DROPPED, Status.RANDOM]),
                gte(mediaTable.nextEpisodeToAir, sql`date('now')`),
                maxAWeek ? lte(mediaTable.nextEpisodeToAir, sql`date('now', '+7 days')`) : undefined,
            ))
            .orderBy(asc(mediaTable.nextEpisodeToAir));
    }

    async addMediaToUserList(userId: number, media: TvType, newStatus: Status) {
        const { listTable } = this.definition.tables;
        const epsPerSeason = await this.getMediaEpsPerSeason(media.id);

        let newTotal = 1;
        let newSeason = 1;
        let newEpisode = 1;

        if (newStatus === Status.COMPLETED) {
            newSeason = epsPerSeason.at(-1)!.season;
            newEpisode = epsPerSeason.at(-1)!.episodes;
            newTotal = epsPerSeason.reduce((acc, curr) => acc + curr.episodes, 0);
        }
        else if (newStatus === Status.PLAN_TO_WATCH || newStatus === Status.RANDOM) {
            newTotal = 0;
            newEpisode = 0;
        }

        const [newMedia] = await getDbClient()
            .insert(listTable)
            .values({
                userId,
                total: newTotal,
                mediaId: media.id,
                status: newStatus,
                currentSeason: newSeason,
                currentEpisode: newEpisode,
                redo2: Array(epsPerSeason.length).fill(0),
            })
            .returning();

        return newMedia;
    }

    async findAllAssociatedDetails(mediaId: number) {
        const { mediaTable, actorTable, genreTable, epsPerSeasonTable, networkTable } = this.definition.tables;

        const details = getDbClient()
            .select({
                ...getTableColumns(mediaTable),
                actors: sql`json_group_array(DISTINCT json_object('id', ${actorTable.id}, 'name', ${actorTable.name}))`.mapWith(JSON.parse),
                genres: sql`json_group_array(DISTINCT json_object('id', ${genreTable.id}, 'name', ${genreTable.name}))`.mapWith(JSON.parse),
                epsPerSeason: sql`json_group_array(DISTINCT json_object('season', ${epsPerSeasonTable.season}, 'episodes', ${epsPerSeasonTable.episodes}))`.mapWith(JSON.parse),
                networks: sql`json_group_array(DISTINCT json_object('id', ${networkTable.id}, 'name', ${networkTable.name}))`.mapWith(JSON.parse),
            })
            .from(mediaTable)
            .leftJoin(actorTable, eq(actorTable.mediaId, mediaTable.id))
            .leftJoin(genreTable, eq(genreTable.mediaId, mediaTable.id))
            .leftJoin(epsPerSeasonTable, eq(epsPerSeasonTable.mediaId, mediaTable.id))
            .leftJoin(networkTable, eq(networkTable.mediaId, mediaTable.id))
            .where(eq(mediaTable.id, mediaId))
            .get();

        if (!details) return;

        const result: TvType & AddedMediaDetails = {
            ...details,
            providerData: {
                name: this.attribution.name,
                url: `${this.attribution.mediaUrl}${details.apiId}`,
            },
            genres: details.genres || [],
            actors: details.actors || [],
            networks: details.networks || [],
            epsPerSeason: details.epsPerSeason || [],
        };

        return result;
    }

    async storeMediaWithDetails({ mediaData, actorsData, seasonsData, networkData, genresData }: UpsertTvWithDetails) {
        const { mediaTable, actorTable, genreTable, epsPerSeasonTable, networkTable } = this.definition.tables;

        const tx = getDbClient();

        const [media] = await tx
            .insert(mediaTable)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: mediaTable.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning();

        const mediaId = media.id;
        if (actorsData && actorsData.length > 0) {
            const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
            await tx.insert(actorTable).values(actorsToAdd)
        }

        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            await tx.insert(genreTable).values(genresToAdd)
        }

        if (seasonsData && seasonsData.length > 0) {
            const epsPerSeasonToAdd = seasonsData.map((data) => ({ mediaId, ...data }));
            await tx.insert(epsPerSeasonTable).values(epsPerSeasonToAdd)
        }

        if (networkData && networkData.length > 0) {
            const networkToAdd = networkData.map((n) => ({ mediaId, ...n }));
            await tx.insert(networkTable).values(networkToAdd)
        }

        return mediaId;
    }

    async updateMediaWithDetails({ mediaData, actorsData, seasonsData, networkData, genresData }: UpsertTvWithDetails) {
        const { mediaTable, actorTable, genreTable, epsPerSeasonTable, networkTable } = this.definition.tables;

        const [media] = await getDbClient()
            .update(mediaTable)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(mediaTable.apiId, mediaData.apiId))
            .returning();

        const mediaId = media.id;

        if (actorsData !== undefined) {
            await getDbClient().delete(actorTable).where(eq(actorTable.mediaId, mediaId));
            if (actorsData.length > 0) {
                const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
                await getDbClient().insert(actorTable).values(actorsToAdd);
            }
        }

        if (Array.isArray(genresData)) {
            await getDbClient().delete(genreTable).where(eq(genreTable.mediaId, mediaId));
            if (genresData.length > 0) {
                const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
                await getDbClient().insert(genreTable).values(genresToAdd);
            }
        }

        if (seasonsData && seasonsData.length > 0) {
            await this._updateUsersWithMedia(mediaId, seasonsData);

            await getDbClient().delete(epsPerSeasonTable).where(eq(epsPerSeasonTable.mediaId, mediaId));
            const epsPerSeasonToAdd = seasonsData.map((data) => ({ mediaId, ...data }));
            await getDbClient().insert(epsPerSeasonTable).values(epsPerSeasonToAdd);
        }

        if (networkData !== undefined) {
            await getDbClient().delete(networkTable).where(eq(networkTable.mediaId, mediaId));
            if (networkData.length > 0) {
                const networkToAdd = networkData.map((n) => ({ mediaId, ...n }));
                await getDbClient().insert(networkTable).values(networkToAdd);
            }
        }

        return true;
    }

    // --- Logic When Updating Seasons data -----------------------------------

    private async _updateUsersWithMedia(mediaId: number, seasonsData: EpsPerSeasonType[]) {
        const { listTable } = this.definition.tables;
        const oldSeasonsData = await this.getMediaEpsPerSeason(mediaId);

        // If nothing changed, do nothing
        if (JSON.stringify(oldSeasonsData) === JSON.stringify(seasonsData)) {
            return;
        }

        const newEpsList = seasonsData.map((s) => s.episodes);
        const usersWithMediaInTheirList = await this._getAllUsersWithMediaInTheirList(mediaId);

        // Process in batches to avoid overwhelming db
        const batches = [];
        const BATCH_SIZE = 50;
        for (let i = 0; i < usersWithMediaInTheirList.length; i += BATCH_SIZE) {
            batches.push(usersWithMediaInTheirList.slice(i, i + BATCH_SIZE));
        }

        // Process each batch
        for (const batch of batches) {
            const updatePromises = batch.map(async (userMedia) => {
                // Calculate how many eps watched in re-watches (oldSeasonsData)
                const oldRedoTotal = userMedia.redo2.reduce((acc, count, idx) => {
                    const epsInSeason = oldSeasonsData[idx]?.episodes || 0;
                    return acc + (count * epsInSeason);
                }, 0);

                // Calculate Absolute Progress
                const absoluteProgress = Math.max(0, userMedia.total - oldRedoTotal);

                // Adjust Redo2 Array length
                const newRedo2 = [...userMedia.redo2];
                if (seasonsData.length > newRedo2.length) {
                    newRedo2.push(...Array(seasonsData.length - newRedo2.length).fill(0));
                }

                // Calculate new Redo Total (seasonsData)
                const newRedoTotal = newRedo2.reduce((acc, count, index) => {
                    const epsInSeason = seasonsData[index]?.episodes || 0;
                    return acc + (count * epsInSeason);
                }, 0);

                // Calculate New Total
                const newTotal = absoluteProgress + newRedoTotal;

                // Map Absolute Progress to new Season/Episode structure
                const newPosition = this._reorderSeasEps(absoluteProgress, newEpsList);

                return getDbClient()
                    .update(listTable)
                    .set({
                        total: newTotal,
                        redo2: newRedo2,
                        currentSeason: newPosition.season,
                        currentEpisode: newPosition.episode,
                    })
                    .where(and(eq(listTable.userId, userMedia.userId), eq(listTable.mediaId, mediaId)));
            });

            // Process batch concurrently
            await Promise.all(updatePromises);
        }
    }

    private async _getAllUsersWithMediaInTheirList(mediaId: number) {
        const { listTable } = this.definition.tables;

        return getDbClient()
            .select()
            .from(listTable)
            .where(eq(listTable.mediaId, mediaId));
    }

    private _reorderSeasEps(absoluteProgress: number, epsList: number[]) {
        const totalEpsAvailable = epsList.reduce((a, b) => a + b, 0);

        // If series empty / progress exceeds series length, cap at last possible episode
        if (totalEpsAvailable === 0 || epsList.length === 0) {
            return { season: 1, episode: 0 };
        }

        if (absoluteProgress >= totalEpsAvailable) {
            return {
                season: epsList.length,
                episode: epsList[epsList.length - 1],
            };
        }

        let accumulated = 0;
        for (let i = 0; i < epsList.length; i += 1) {
            const seasonEps = epsList[i];
            if (accumulated + seasonEps >= absoluteProgress) {
                return {
                    season: i + 1,
                    episode: Math.max(0, absoluteProgress - accumulated),
                };
            }
            accumulated += seasonEps;
        }

        return { season: 1, episode: 0 };
    }
}
