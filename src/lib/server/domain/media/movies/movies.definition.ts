import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {asc, desc, getTableColumns, ne, sql} from "drizzle-orm";
import {defineMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {createArrayFilter, createMediaColOptionsLoader} from "@/lib/server/domain/media/base/media-list.query";
import {movies, moviesActors, moviesGenre, moviesList, moviesTags} from "@/lib/server/database/schema/media/movies.schema";


export const moviesDefinition = defineMediaDefinition({
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
            defaultSort: "Title A-Z",
            sorts: {
                "Title A-Z": asc(movies.name),
                "Title Z-A": desc(movies.name),
                "Rating +": [desc(moviesList.rating), asc(movies.name)],
                "Rating -": [asc(moviesList.rating), asc(movies.name)],
                "TMDB Rating +": [desc(movies.voteAverage), asc(movies.name)],
                "TMDB Rating -": [asc(movies.voteAverage), asc(movies.name)],
                "Release Date +": [desc(movies.releaseDate), asc(movies.name)],
                "Release Date -": [sql`${movies.releaseDate} ASC NULLS LAST`, asc(movies.name)],
                "Recently Added": [desc(moviesList.addedAt), asc(movies.name)],
                "Recently Modified": [desc(moviesList.lastUpdated), asc(movies.name)],
                "Re-Watched": [desc(moviesList.redo), asc(movies.name)],
            },
        },
        stats: {
            community: {
                totalRedo: sql<number>`COALESCE(SUM(${moviesList.redo}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${moviesList.total}), 0)`,
            },
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
            affinity: {
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
    service: {
        defaultStatus: Status.PLAN_TO_WATCH,
        editableFields: [
            "originalName", "name", "directorName", "releaseDate", "duration", "synopsis",
            "budget", "revenue", "tagline", "originalLanguage", "lockStatus", "homepage",
        ],
        progressTotals: (state, media) => ({
            totalRedo: state?.redo ?? 0,
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * media.duration,
        }),
    },
    ingestion: {
        defaultDuration: 100,
        limits: {
            genres: 5,
            actors: 5,
        },
    },
    attribution: {
        name: "TMDB",
        mediaUrl: "https://www.themoviedb.org/movie/",
    },
});


export type MovieDefinition = typeof moviesDefinition;
export type MovieRepositoryDefinition = MovieDefinition["repository"];
