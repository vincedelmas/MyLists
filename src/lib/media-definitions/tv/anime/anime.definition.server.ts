import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {getTableColumns, notInArray, sql} from "drizzle-orm";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaFilterDefinitions} from "@/lib/server/domain/media/base/media-filters.queries";
import {ANIME_FALLBACK_DURATION, animeDefinition} from "@/lib/media-definitions/tv/anime/anime.definition";
import {createMediaListSorts, getCommonMediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {anime, animeActors, animeEpisodesPerSeason, animeGenre, animeList, animeListSeasons, animeNetwork, animeTags} from "@/lib/server/database/schema/media/anime.schema";


const tables = {
    mediaTable: anime,
    tagTable: animeTags,
    listTable: animeList,
    genreTable: animeGenre,
    actorTable: animeActors,
    networkTable: animeNetwork,
    seasonStateTable: animeListSeasons,
    epsPerSeasonTable: animeEpisodesPerSeason,
    deleteDependents: [animeEpisodesPerSeason, animeNetwork, animeActors, animeGenre, animeTags],
};


const sortColumns = {
    ...getCommonMediaSortColumns(tables),
    redo: animeList.redo,
    providerRating: anime.voteAverage,
};


export const animeServerDefinition = defineServerMediaDefinition({
    identity: {
        mediaType: MediaType.ANIME,
        coverDirectory: "anime-covers",
    },
    repository: {
        tables,
        sortColumns,
        popularity: {
            eligibility: sql`${anime.voteCount} >= 50`,
        },
        filters: defineMediaFilterDefinitions(animeDefinition, tables, {
            actors: {
                entityTable: animeActors,
                filterColumn: animeActors.name,
            },
            networks: {
                entityTable: animeNetwork,
                filterColumn: animeNetwork.name,
            },
            creators: {
                filterColumn: anime.createdBy,
                splitValues: true,
            },
            langs: {
                filterColumn: anime.originCountry,
            },
        }),
        listQuery: {
            sorts: createMediaListSorts(animeDefinition, sortColumns, anime.id),
            defaultSort: getMediaSortLabel(animeDefinition, animeDefinition.sorting.default),
            selection: {
                mediaName: anime.name,
                imageCover: anime.imageCover,
                epsPerSeason: sql<{ season: number; episodes: number }[]>`(
                    SELECT
                        json_group_array(json_object(
                            'season', ${animeEpisodesPerSeason.season},
                            'episodes', ${animeEpisodesPerSeason.episodes}
                        ))
                    FROM ${animeEpisodesPerSeason}
                    WHERE ${animeEpisodesPerSeason.mediaId} = ${anime.id}
                )`.mapWith(JSON.parse),
                ...getTableColumns(animeList),
            },
        },
        communityActivity: {
            aggregates: {
                totalRedo: sql<number>`COALESCE(SUM(${animeList.redo}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${animeList.total}), 0)`,
            },
        },
        jobs: {
            [JobType.ACTOR]: {
                sourceTable: animeActors,
                nameColumn: animeActors.name,
                mediaIdColumn: animeActors.mediaId,
            },
            [JobType.PLATFORM]: {
                sourceTable: animeNetwork,
                nameColumn: animeNetwork.name,
                mediaIdColumn: animeNetwork.mediaId,
            },
            [JobType.CREATOR]: {
                sourceTable: anime,
                mediaIdColumn: anime.id,
                nameColumn: anime.createdBy,
                postProcess: (results) => Array.from(
                    new Map(results
                        .filter((item) => item.name)
                        .flatMap((item) => item.name!.split(","))
                        .map((name) => name.trim())
                        .filter(Boolean)
                        .map((name) => [name, { name }]),
                    ).values(),
                ),
            },
        },
    },
    statistics: {
        allUsers: {
            totalRedo: sql<number>`COALESCE(SUM(${animeList.redo}), 0)`,
            totalSpecific: sql<number>`COALESCE(SUM(${animeList.total}), 0)`,
            timeSpent: sql<number>`COALESCE(SUM(${animeList.total} * ${anime.duration}), 0)`,
        },
        affinity: defineAffinityDefinitions(animeDefinition, {
            networksStats: {
                minRatingCount: 3,
                metricTable: animeNetwork,
                mediaLinkCol: animeList.mediaId,
                metricNameCol: animeNetwork.name,
                metricIdCol: animeNetwork.mediaId,
                filters: [notInArray(animeList.status, [Status.RANDOM, Status.PLAN_TO_WATCH])],
            },
            countriesStats: {
                metricTable: anime,
                metricIdCol: anime.id,
                mediaLinkCol: animeList.mediaId,
                metricNameCol: anime.originCountry,
                filters: [notInArray(animeList.status, [Status.RANDOM, Status.PLAN_TO_WATCH])],
            },
            actorsStats: {
                minRatingCount: 3,
                metricTable: animeActors,
                metricNameCol: animeActors.name,
                metricIdCol: animeActors.mediaId,
                mediaLinkCol: animeList.mediaId,
                filters: [notInArray(animeList.status, [Status.RANDOM, Status.PLAN_TO_WATCH])],
            },
        }),
    },
    service: {
        defaultStatus: Status.PLAN_TO_WATCH,
        editableFields: [
            "name", "originalName", "releaseDate", "lastAirDate", "homepage", "createdBy",
            "duration", "originCountry", "prodStatus", "synopsis", "lockStatus", "imageCover",
        ],
        progressTotals: (state, media) => ({
            totalRedo: state?.redo ?? 0,
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * media.duration,
        }),
    },
    ingestion: {
        externalApiSource: ApiProviderType.TMDB,
        defaultDuration: ANIME_FALLBACK_DURATION,
        limits: {
            genres: 5,
            actors: 5,
            writers: 2,
            networks: 2,
        },
        refresh: {
            staleAfterDays: 1,
        },
    },
    attribution: {
        name: "TMDB",
        mediaUrl: "https://www.themoviedb.org/tv/",
    },
});


export type AnimeServerDefinition = typeof animeServerDefinition;
