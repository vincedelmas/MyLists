import {getTableColumns, ne, sql} from "drizzle-orm";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {createMediaListSorts} from "@/lib/server/domain/media/base/media-browse.queries";
import {MOVIES_FALLBACK_DURATION, moviesDefinition} from "@/lib/media-definitions/movies/movies.definition";
import {createArrayFilter, createMediaColOptionsLoader} from "@/lib/server/domain/media/base/media-list.queries";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {movies, moviesActors, moviesGenre, moviesList, moviesTags} from "@/lib/server/database/schema/media/movies.schema";


export const moviesServerDefinition = defineServerMediaDefinition({
    identity: {
        mediaType: MediaType.MOVIES,
        coverDirectory: "movies-covers",
    },
    repository: {
        tables: {
            mediaTable: movies,
            listTable: moviesList,
            genreTable: moviesGenre,
            tagTable: moviesTags,
            deleteDependents: [moviesActors, moviesGenre, moviesTags],
        },
        popularity: {
            eligibility: sql`${movies.voteCount} >= 1000`,
        },
        listQuery: {
            selection: {
                mediaName: movies.name,
                imageCover: movies.imageCover,
                ...getTableColumns(moviesList),
            },
            filters: {
                actors: createArrayFilter({
                    argName: "actors",
                    mediaTable: movies,
                    entityTable: moviesActors,
                    filterColumn: moviesActors.name,
                }),
                langs: createArrayFilter({
                    argName: "langs",
                    mediaTable: movies,
                    filterColumn: movies.originalLanguage,
                }),
                directors: createArrayFilter({
                    argName: "directors",
                    mediaTable: movies,
                    filterColumn: movies.directorName,
                }),
            },
            filterOptions: {
                langs: createMediaColOptionsLoader({
                    mediaTable: movies,
                    listTable: moviesList,
                    nameColumn: movies.originalLanguage,
                }),
            },
            defaultSort: getMediaSortLabel(moviesDefinition, moviesDefinition.sorting.default),
            sorts: createMediaListSorts(moviesDefinition, { mediaTable: movies, listTable: moviesList }),
        },
        communityActivity: {
            aggregates: {
                totalRedo: sql<number>`COALESCE(SUM(${moviesList.redo}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${moviesList.total}), 0)`,
            },
        },
        jobs: {
            [JobType.ACTOR]: {
                sourceTable: moviesActors,
                nameColumn: moviesActors.name,
                mediaIdColumn: moviesActors.mediaId,
            },
            [JobType.CREATOR]: {
                sourceTable: movies,
                mediaIdColumn: movies.id,
                nameColumn: movies.directorName,
            },
            [JobType.COMPOSITOR]: {
                sourceTable: movies,
                mediaIdColumn: movies.id,
                nameColumn: movies.compositorName,
            },
        },
    },
    statistics: {
        allUsers: {
            timeSpent: sql<number>`
                COALESCE(SUM(CASE
                    WHEN ${moviesList.status} = ${Status.COMPLETED} THEN (1 + ${moviesList.redo}) * ${movies.duration}
                    ELSE 0
                END), 0)
            `,
            totalSpecific: sql<number>`
                COALESCE(SUM(CASE
                    WHEN ${moviesList.status} = ${Status.COMPLETED} THEN 1 + ${moviesList.redo}
                    ELSE 0
                END), 0)
            `,
        },
        affinity: defineAffinityDefinitions(moviesDefinition, {
            langsStats: {
                metricTable: movies,
                metricIdCol: movies.id,
                mediaLinkCol: moviesList.mediaId,
                metricNameCol: movies.originalLanguage,
                filters: [ne(moviesList.status, Status.PLAN_TO_WATCH)],
            },
            directorsStats: {
                metricTable: movies,
                metricIdCol: movies.id,
                mediaLinkCol: moviesList.mediaId,
                metricNameCol: movies.directorName,
                filters: [ne(moviesList.status, Status.PLAN_TO_WATCH)],
            },
            actorsStats: {
                metricTable: moviesActors,
                metricNameCol: moviesActors.name,
                mediaLinkCol: moviesList.mediaId,
                metricIdCol: moviesActors.mediaId,
                filters: [ne(moviesList.status, Status.PLAN_TO_WATCH)],
            },
        }),
    },
    service: {
        defaultStatus: Status.PLAN_TO_WATCH,
        editableFields: [
            "originalName", "name", "directorName", "releaseDate", "duration", "synopsis",
            "budget", "revenue", "tagline", "originalLanguage", "lockStatus", "homepage",
            "imageCover",
        ],
        progressTotals: (state, media) => ({
            totalRedo: state?.redo ?? 0,
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * media.duration,
        }),
    },
    ingestion: {
        defaultDuration: MOVIES_FALLBACK_DURATION,
        externalApiSource: ApiProviderType.TMDB,
        limits: {
            genres: 5,
            actors: 5,
        },
        refresh: {
            staleAfterDays: 2,
            lockAfterMonths: 6,
            releaseGraceMonths: 6,
        },
    },
    attribution: {
        name: "TMDB",
        mediaUrl: "https://www.themoviedb.org/movie/",
    },
});


export type MovieServerDefinition = typeof moviesServerDefinition;
