import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {asc, desc, getTableColumns, notInArray, sql} from "drizzle-orm";
import {defineMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {createArrayFilter, createMediaColOptionsLoader} from "@/lib/server/domain/media/base/media-list.query";
import {series, seriesActors, seriesEpisodesPerSeason, seriesGenre, seriesList, seriesNetwork, seriesTags} from "@/lib/server/database/schema/media/series.schema";


export const seriesDefinition = defineMediaDefinition({
    repository: {
        mediaType: MediaType.SERIES,
        tables: {
            mediaTable: series,
            listTable: seriesList,
            genreTable: seriesGenre,
            tagTable: seriesTags,
            actorTable: seriesActors,
            networkTable: seriesNetwork,
            epsPerSeasonTable: seriesEpisodesPerSeason,
            deleteDependents: [seriesEpisodesPerSeason, seriesNetwork, seriesActors, seriesGenre, seriesTags],
        },
        popularity: {
            eligibility: sql`${series.voteCount} >= 300`,
        },
        listQuery: {
            selection: {
                mediaName: series.name,
                imageCover: series.imageCover,
                epsPerSeason: sql<{ season: number; episodes: number }[]>`(
                    SELECT
                        json_group_array(json_object(
                            'season', ${seriesEpisodesPerSeason.season},
                            'episodes', ${seriesEpisodesPerSeason.episodes}
                        ))
                    FROM ${seriesEpisodesPerSeason}
                    WHERE ${seriesEpisodesPerSeason.mediaId} = ${series.id}
                )`.mapWith(JSON.parse),
                ...getTableColumns(seriesList),
            },
            filters: {
                actors: createArrayFilter({
                    argName: "actors",
                    mediaTable: series,
                    entityTable: seriesActors,
                    filterColumn: seriesActors.name,
                }),
                networks: createArrayFilter({
                    argName: "networks",
                    mediaTable: series,
                    entityTable: seriesNetwork,
                    filterColumn: seriesNetwork.name,
                }),
                creators: createArrayFilter({
                    argName: "creators",
                    mediaTable: series,
                    filterColumn: series.createdBy,
                }),
                langs: createArrayFilter({
                    argName: "langs",
                    mediaTable: series,
                    filterColumn: series.originCountry,
                }),
            },
            filterOptions: {
                langs: createMediaColOptionsLoader({
                    mediaTable: series,
                    listTable: seriesList,
                    nameColumn: series.originCountry,
                }),
            },
            defaultSort: "Title A-Z",
            sorts: {
                "Title A-Z": asc(series.name),
                "Title Z-A": desc(series.name),
                "Release Date +": [desc(series.releaseDate), asc(series.name)],
                "Release Date -": [sql`${series.releaseDate} ASC NULLS LAST`, asc(series.name)],
                "TMDB Rating +": [desc(series.voteAverage), asc(series.name)],
                "TMDB Rating -": [asc(series.voteAverage), asc(series.name)],
                "Recently Added": [desc(seriesList.addedAt), asc(series.name)],
                "Recently Modified": [desc(seriesList.lastUpdated), asc(series.name)],
                "Rating +": [desc(seriesList.rating), asc(series.name)],
                "Rating -": [asc(seriesList.rating), asc(series.name)],
                "Re-watched": [desc(seriesList.redo), asc(series.name)],
            },
        },
        stats: {
            community: {
                totalRedo: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(value), 0) FROM json_each(${seriesList.redo2}))), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${seriesList.total}), 0)`,
            },
            allUsers: {
                timeSpent: sql<number>`COALESCE(SUM(${seriesList.total} * ${series.duration}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${seriesList.total}), 0)`,
                totalRedo: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(value), 0) FROM json_each(${seriesList.redo2}))), 0)`,
            },
            affinity: {
                networksStats: {
                    minRatingCount: 3,
                    metricTable: seriesNetwork,
                    mediaLinkCol: seriesList.mediaId,
                    metricNameCol: seriesNetwork.name,
                    metricIdCol: seriesNetwork.mediaId,
                    filters: [notInArray(seriesList.status, [Status.RANDOM, Status.PLAN_TO_WATCH])],
                },
                countriesStats: {
                    metricTable: series,
                    metricIdCol: series.id,
                    mediaLinkCol: seriesList.mediaId,
                    metricNameCol: series.originCountry,
                    filters: [notInArray(seriesList.status, [Status.RANDOM, Status.PLAN_TO_WATCH])],
                },
                actorsStats: {
                    minRatingCount: 3,
                    metricTable: seriesActors,
                    metricNameCol: seriesActors.name,
                    metricIdCol: seriesActors.mediaId,
                    mediaLinkCol: seriesList.mediaId,
                    filters: [notInArray(seriesList.status, [Status.RANDOM, Status.PLAN_TO_WATCH])],
                },
            },
        },
        jobs: {
            [JobType.ACTOR]: {
                sourceTable: seriesActors,
                nameColumn: seriesActors.name,
                mediaIdColumn: seriesActors.mediaId,
            },
            [JobType.CREATOR]: {
                mediaIdColumn: series.id,
                sourceTable: series,
                nameColumn: series.createdBy,
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
                sourceTable: seriesNetwork,
                nameColumn: seriesNetwork.name,
                mediaIdColumn: seriesNetwork.mediaId,
            },
        },
    },
    service: {
        mediaType: MediaType.SERIES,
        coverDirectory: "series-covers",
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
    attribution: {
        name: "TMDB",
        mediaUrl: "https://www.themoviedb.org/tv/",
    },
});


export type SeriesDefinition = typeof seriesDefinition;
export type SeriesRepositoryDefinition = SeriesDefinition["repository"];
