import {asc, desc, getTableColumns, notInArray, sql} from "drizzle-orm";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {createArrayFilter, createMediaColOptionsLoader} from "@/lib/server/domain/media/base/media-list.query";
import {anime, animeActors, animeEpisodesPerSeason, animeGenre, animeList, animeNetwork, animeTags} from "@/lib/server/database/schema/media/anime.schema";


export const animeDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.ANIME,
        coverDirectory: "anime-covers",
    },
    repository: {
        tables: {
            mediaTable: anime,
            listTable: animeList,
            genreTable: animeGenre,
            tagTable: animeTags,
            actorTable: animeActors,
            networkTable: animeNetwork,
            epsPerSeasonTable: animeEpisodesPerSeason,
            deleteDependents: [animeEpisodesPerSeason, animeNetwork, animeActors, animeGenre, animeTags],
        },
        popularity: {
            eligibility: sql`${anime.voteCount} >= 50`,
        },
        listQuery: {
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
            filters: {
                actors: createArrayFilter({
                    argName: "actors",
                    mediaTable: anime,
                    entityTable: animeActors,
                    filterColumn: animeActors.name,
                }),
                networks: createArrayFilter({
                    argName: "networks",
                    mediaTable: anime,
                    entityTable: animeNetwork,
                    filterColumn: animeNetwork.name,
                }),
                creators: createArrayFilter({
                    argName: "creators",
                    mediaTable: anime,
                    filterColumn: anime.createdBy,
                }),
                langs: createArrayFilter({
                    argName: "langs",
                    mediaTable: anime,
                    filterColumn: anime.originCountry,
                }),
            },
            filterOptions: {
                langs: createMediaColOptionsLoader({
                    mediaTable: anime,
                    listTable: animeList,
                    nameColumn: anime.originCountry,
                }),
            },
            defaultSort: "Title A-Z",
            sorts: {
                "Title A-Z": asc(anime.name),
                "Title Z-A": desc(anime.name),
                "Release Date +": [desc(anime.releaseDate), asc(anime.name)],
                "Release Date -": [sql`${anime.releaseDate} ASC NULLS LAST`, asc(anime.name)],
                "TMDB Rating +": [desc(anime.voteAverage), asc(anime.name)],
                "TMDB Rating -": [asc(anime.voteAverage), asc(anime.name)],
                "Recently Added": [desc(animeList.addedAt), asc(anime.name)],
                "Recently Modified": [desc(animeList.lastUpdated), asc(anime.name)],
                "Rating +": [desc(animeList.rating), asc(anime.name)],
                "Rating -": [asc(animeList.rating), asc(anime.name)],
                "Re-watched": [desc(animeList.redo), asc(anime.name)],
            },
        },
        stats: {
            community: {
                totalRedo: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(value), 0) FROM json_each(${animeList.redo2}))), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${animeList.total}), 0)`,
            },
            allUsers: {
                timeSpent: sql<number>`COALESCE(SUM(${animeList.total} * ${anime.duration}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${animeList.total}), 0)`,
                totalRedo: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(value), 0) FROM json_each(${animeList.redo2}))), 0)`,
            },
            affinity: {
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
            },
        },
        jobs: {
            [JobType.ACTOR]: {
                sourceTable: animeActors,
                nameColumn: animeActors.name,
                mediaIdColumn: animeActors.mediaId,
            },
            [JobType.CREATOR]: {
                mediaIdColumn: anime.id,
                sourceTable: anime,
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
            [JobType.PLATFORM]: {
                sourceTable: animeNetwork,
                nameColumn: animeNetwork.name,
                mediaIdColumn: animeNetwork.mediaId,
            },
        },
    },
    service: {
        defaultStatus: Status.PLAN_TO_WATCH,
        editableFields: [
            "name", "originalName", "releaseDate", "lastAirDate", "homepage",
            "createdBy", "duration", "originCountry", "prodStatus", "synopsis", "lockStatus",
        ],
        progressTotals: (state, media) => ({
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * media.duration,
            totalRedo: state?.redo2.reduce((sum, value) => sum + value, 0) ?? 0,
        }),
    },
    ingestion: {
        defaultDuration: 24,
        externalApiSource: ApiProviderType.TMDB,
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


export type AnimeDefinition = typeof animeDefinition;
