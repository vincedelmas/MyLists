import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {getTableColumns, not, notInArray, sql} from "drizzle-orm";
import type {EpsPerSeasonType} from "@/lib/types/media-list.types";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {seriesMyListsCSVRowSchema} from "@/lib/server/domain/media/tv/tv.types";
import {defineMediaFilterDefinitions} from "@/lib/server/domain/media/base/media-filters.queries";
import {SERIES_FALLBACK_DURATION, seriesDefinition} from "@/lib/media-definitions/tv/series/series.definition";
import {createMediaListSorts, getCommonMediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {
    series,
    seriesActors,
    seriesEpisodesPerSeason,
    seriesGenre,
    seriesList,
    seriesListSeasons,
    seriesNetwork,
    seriesTags
} from "@/lib/server/database/schema/media/series.schema";


const tables = {
    mediaTable: series,
    listTable: seriesList,
    seasonStateTable: seriesListSeasons,
    genreTable: seriesGenre,
    tagTable: seriesTags,
    actorTable: seriesActors,
    networkTable: seriesNetwork,
    epsPerSeasonTable: seriesEpisodesPerSeason,
    deleteDependents: [seriesEpisodesPerSeason, seriesNetwork, seriesActors, seriesGenre, seriesTags],
};


const sortColumns = {
    ...getCommonMediaSortColumns(tables),
    redo: seriesList.redo,
    providerRating: series.voteAverage,
};


export const seriesServerDefinition = defineServerMediaDefinition({
    listImport: { csvRowSchema: seriesMyListsCSVRowSchema },
    identity: {
        mediaType: MediaType.SERIES,
        coverDirectory: "series-covers",
    },
    repository: {
        tables,
        sortColumns,
        continuePreviewCondition: not(sql`EXISTS (
            SELECT 1 FROM ${seriesEpisodesPerSeason}
            WHERE ${seriesEpisodesPerSeason.mediaId} = ${series.id}
                AND ${seriesEpisodesPerSeason.season} = (SELECT MAX(s.season) FROM ${seriesEpisodesPerSeason} s WHERE s.media_id = ${series.id})
                AND ${seriesEpisodesPerSeason.season} = ${seriesList.currentSeason}
                AND ${seriesEpisodesPerSeason.episodes} > 0
                AND ${seriesEpisodesPerSeason.episodes} = ${seriesList.currentEpisode}
        )`),
        filters: defineMediaFilterDefinitions(seriesDefinition, tables, {
            actors: {
                searchable: true,
                entityTable: seriesActors,
                filterColumn: seriesActors.name,
            },
            networks: {
                searchable: true,
                entityTable: seriesNetwork,
                filterColumn: seriesNetwork.name,
            },
            creators: {
                searchable: true,
                filterColumn: series.createdBy,
                splitValues: true,
            },
            langs: {
                filterColumn: series.originCountry,
            },
        }),
        popularity: {
            eligibility: sql`${series.voteCount} >= 300`,
        },
        listQuery: {
            selection: {
                mediaName: series.name,
                duration: series.duration,
                imageCover: series.imageCover,
                epsPerSeason: sql`(
                    SELECT
                        json_group_array(json_object(
                            'season', ${seriesEpisodesPerSeason.season},
                            'episodes', ${seriesEpisodesPerSeason.episodes}
                        ))
                    FROM ${seriesEpisodesPerSeason}
                    WHERE ${seriesEpisodesPerSeason.mediaId} = ${series.id}
                )`.mapWith((value): EpsPerSeasonType[] => JSON.parse(value)),
                ...getTableColumns(seriesList),
            },
            defaultSort: getMediaSortLabel(seriesDefinition, seriesDefinition.sorting.default),
            sorts: createMediaListSorts(seriesDefinition, sortColumns, series.id),
        },
        communityActivity: {
            aggregates: {
                totalRedo: sql<number>`COALESCE(SUM(${seriesList.redo}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${seriesList.total}), 0)`,
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
    statistics: {
        allUsers: {
            timeSpent: sql<number>`COALESCE(SUM(${seriesList.total} * ${series.duration}), 0)`,
            totalSpecific: sql<number>`COALESCE(SUM(${seriesList.total}), 0)`,
            totalRedo: sql<number>`COALESCE(SUM(${seriesList.redo}), 0)`,
        },
        affinity: defineAffinityDefinitions(seriesDefinition, {
            networksStats: {
                minRatingCount: 3,
                metricTable: seriesNetwork,
                mediaLinkCol: seriesList.mediaId,
                metricNameCol: seriesNetwork.name,
                metricIdCol: seriesNetwork.mediaId,
                filters: [notInArray(seriesList.status, [Status.RANDOM, Status.PLANNED])],
            },
            countriesStats: {
                metricTable: series,
                metricIdCol: series.id,
                mediaLinkCol: seriesList.mediaId,
                metricNameCol: series.originCountry,
                filters: [notInArray(seriesList.status, [Status.RANDOM, Status.PLANNED])],
            },
            actorsStats: {
                minRatingCount: 3,
                metricTable: seriesActors,
                metricNameCol: seriesActors.name,
                metricIdCol: seriesActors.mediaId,
                mediaLinkCol: seriesList.mediaId,
                filters: [notInArray(seriesList.status, [Status.RANDOM, Status.PLANNED])],
            },
        }),
    },
    service: {
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
        defaultDuration: SERIES_FALLBACK_DURATION,
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


export type SeriesServerDefinition = typeof seriesServerDefinition;
