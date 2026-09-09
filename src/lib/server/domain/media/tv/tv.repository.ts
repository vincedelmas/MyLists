import {Status} from "@/lib/utils/enums";
import {user} from "@/lib/server/database/schema";
import {EpsPerSeasonType} from "@/lib/types/media-list.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AddedMediaDetails} from "@/lib/types/media-common.types";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {TvType, UpdateTvWithDetails, UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {and, asc, eq, getTableColumns, gte, inArray, isNotNull, isNull, lte, max, notInArray, or, sql} from "drizzle-orm";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export function createTvRepository(definition: TvDefinition) {
    const { ingestion, attribution, repository: repoDefinition } = definition;

    const queries = createMediaQueries(definition);

    function getMediaEpsPerSeason(mediaId: number) {
        const { epsPerSeasonTable } = repoDefinition.tables;

        return getDbClient()
            .select({
                season: epsPerSeasonTable.season,
                episodes: epsPerSeasonTable.episodes,
            })
            .from(epsPerSeasonTable)
            .where(eq(epsPerSeasonTable.mediaId, mediaId))
            .orderBy(asc(epsPerSeasonTable.season)).all();
    }

    async function getMediaIdsToBeRefreshed(apiIds: number[]) {
        const { mediaTable } = repoDefinition.tables;
        const staleAfter = `-${ingestion.refresh.staleAfterDays} days`;

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

    async function getUpcomingMedia(userId?: number, maxAWeek?: boolean) {
        const { mediaTable, listTable, epsPerSeasonTable } = repoDefinition.tables;

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

    function addMediaToUserList(userId: number, media: TvType, newStatus: Status) {
        const { listTable } = repoDefinition.tables;
        const epsPerSeason = getMediaEpsPerSeason(media.id);

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

        const [newMedia] = getDbClient()
            .insert(listTable)
            .values({
                userId,
                total: newTotal,
                mediaId: media.id,
                status: newStatus,
                currentSeason: newSeason,
                currentEpisode: newEpisode,
                redo: Array(epsPerSeason.length).fill(0),
            })
            .returning().all();

        return newMedia;
    }

    async function findAllAssociatedDetails(mediaId: number) {
        const { mediaTable, actorTable, genreTable, epsPerSeasonTable, networkTable } = repoDefinition.tables;

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
                name: attribution.name,
                url: `${attribution.mediaUrl}${details.apiId}`,
            },
            genres: details.genres || [],
            actors: details.actors || [],
            networks: details.networks || [],
            epsPerSeason: details.epsPerSeason || [],
        };

        return result;
    }

    function storeMediaWithDetails({ mediaData, actorsData, seasonsData, networkData, genresData }: UpsertTvWithDetails) {
        const { mediaTable, actorTable, genreTable, epsPerSeasonTable, networkTable } = repoDefinition.tables;

        const tx = getDbClient();

        const [media] = tx
            .insert(mediaTable)
            .values({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .onConflictDoUpdate({
                target: mediaTable.apiId,
                set: { lastApiUpdate: sql`datetime('now')` },
            })
            .returning().all();

        const mediaId = media.id;
        if (actorsData && actorsData.length > 0) {
            const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
            tx.insert(actorTable).values(actorsToAdd).onConflictDoNothing().run();
        }

        if (genresData && genresData.length > 0) {
            const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
            tx.insert(genreTable).values(genresToAdd).onConflictDoNothing().run();
        }

        if (seasonsData && seasonsData.length > 0) {
            const epsPerSeasonToAdd = seasonsData.map((data) => ({ mediaId, ...data }));
            tx.insert(epsPerSeasonTable).values(epsPerSeasonToAdd).onConflictDoNothing().run();
        }

        if (networkData && networkData.length > 0) {
            const networkToAdd = networkData.map((n) => ({ mediaId, ...n }));
            tx.insert(networkTable).values(networkToAdd).onConflictDoNothing().run();
        }

        return mediaId;
    }

    function updateMediaWithDetails({ mediaData, actorsData, seasonsData, networkData, genresData }: UpdateTvWithDetails) {
        const { mediaTable, actorTable, genreTable, epsPerSeasonTable, networkTable } = repoDefinition.tables;

        const [media] = getDbClient()
            .update(mediaTable)
            .set({
                ...mediaData,
                lastApiUpdate: sql`datetime('now')`,
            })
            .where(eq(mediaTable.apiId, mediaData.apiId))
            .returning().all();

        const mediaId = media.id;

        if (actorsData !== undefined) {
            getDbClient().delete(actorTable).where(eq(actorTable.mediaId, mediaId)).run();
            if (actorsData.length > 0) {
                const actorsToAdd = actorsData.map((a) => ({ mediaId, ...a }));
                getDbClient().insert(actorTable).values(actorsToAdd).onConflictDoNothing().run();
            }
        }

        if (Array.isArray(genresData)) {
            getDbClient().delete(genreTable).where(eq(genreTable.mediaId, mediaId)).run();
            if (genresData.length > 0) {
                const genresToAdd = genresData.map((g) => ({ mediaId, ...g }));
                getDbClient().insert(genreTable).values(genresToAdd).onConflictDoNothing().run();
            }
        }

        if (seasonsData && seasonsData.length > 0) {
            _updateUsersWithMedia(mediaId, seasonsData);

            getDbClient().delete(epsPerSeasonTable).where(eq(epsPerSeasonTable.mediaId, mediaId)).run();
            const epsPerSeasonToAdd = seasonsData.map((data) => ({ mediaId, ...data }));
            getDbClient().insert(epsPerSeasonTable).values(epsPerSeasonToAdd).onConflictDoNothing().run();
        }

        if (networkData !== undefined) {
            getDbClient().delete(networkTable).where(eq(networkTable.mediaId, mediaId)).run();
            if (networkData.length > 0) {
                const networkToAdd = networkData.map((n) => ({ mediaId, ...n }));
                getDbClient().insert(networkTable).values(networkToAdd).onConflictDoNothing().run();
            }
        }

        return true;
    }

    // --- Logic When Updating Seasons data -----------------------------------

    function _updateUsersWithMedia(mediaId: number, seasonsData: EpsPerSeasonType[]) {
        const { listTable } = repoDefinition.tables;
        const oldSeasonsData = getMediaEpsPerSeason(mediaId);

        // If nothing changed, do nothing
        if (JSON.stringify(oldSeasonsData) === JSON.stringify(seasonsData)) {
            return;
        }

        const newEpsList = seasonsData.map((s) => s.episodes);
        const oldTotalEpisodes = oldSeasonsData.reduce((total, season) => total + season.episodes, 0);
        const oldMaxSeason = Math.max(...oldSeasonsData.map((season) => season.season), 0);
        const newMaxSeason = Math.max(...seasonsData.map((season) => season.season), 0);
        const hasNewSeason = newMaxSeason > oldMaxSeason;
        const usersWithMediaInTheirList = _getAllUsersWithMediaInTheirList(mediaId);

        for (const userMedia of usersWithMediaInTheirList) {
            // Calculate how many eps watched in re-watches (oldSeasonsData)
            const oldRedoTotal = userMedia.redo.reduce((acc, count, idx) => {
                const epsInSeason = oldSeasonsData[idx]?.episodes || 0;
                return acc + (count * epsInSeason);
            }, 0);

            // Calculate Absolute Progress
            const absoluteProgress = Math.max(0, userMedia.total - oldRedoTotal);
            const shouldMoveToOnHold = hasNewSeason
                && userMedia.autoMoveCompletedTvToOnHold
                && userMedia.status === Status.COMPLETED
                && absoluteProgress >= oldTotalEpisodes;

            // Keep per-season re-watches aligned when seasons are added or removed.
            const newRedo = Array.from({ length: seasonsData.length }, (_, index) => userMedia.redo[index] ?? 0);

            // Calculate new Redo Total (seasonsData)
            const newRedoTotal = newRedo.reduce((acc, count, index) => {
                const epsInSeason = seasonsData[index]?.episodes || 0;
                return acc + (count * epsInSeason);
            }, 0);

            // Calculate New Total
            const newTotal = absoluteProgress + newRedoTotal;

            // Map Absolute Progress to new Season/Episode structure
            const newPosition = _reorderSeasEps(absoluteProgress, newEpsList);

            // The maintenance task rebuilds precomputed user stats after bulk refresh.
            getDbClient()
                .update(listTable)
                .set({
                    total: newTotal,
                    redo: newRedo,
                    currentSeason: newPosition.season,
                    currentEpisode: newPosition.episode,
                    status: shouldMoveToOnHold ? Status.ON_HOLD : userMedia.status,
                })
                .where(and(eq(listTable.userId, userMedia.userId), eq(listTable.mediaId, mediaId))).run();
        }
    }

    function _getAllUsersWithMediaInTheirList(mediaId: number) {
        const { listTable } = repoDefinition.tables;

        return getDbClient()
            .select({
                ...getTableColumns(listTable),
                autoMoveCompletedTvToOnHold: user.autoMoveCompletedTvToOnHold,
            })
            .from(listTable)
            .innerJoin(user, eq(listTable.userId, user.id))
            .where(eq(listTable.mediaId, mediaId)).all();
    }

    function _reorderSeasEps(absoluteProgress: number, epsList: number[]) {
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

    return {
        ...queries,
        getUpcomingMedia,
        addMediaToUserList,
        getMediaEpsPerSeason,
        storeMediaWithDetails,
        updateMediaWithDetails,
        getMediaIdsToBeRefreshed,
        findAllAssociatedDetails,
    };
}


export type TvRepository = ReturnType<typeof createTvRepository>;
