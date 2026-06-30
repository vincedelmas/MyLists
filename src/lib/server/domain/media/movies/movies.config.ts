import {asc, desc, getTableColumns, sql} from "drizzle-orm";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {MediaSchemaConfig} from "@/lib/types/media.config.types";
import {createArrayFilterDef} from "@/lib/server/domain/media/base/base.repository";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements.seed";
import {movies, moviesActors, moviesGenre, moviesList, moviesTags} from "@/lib/server/database/schema/media/movies.schema";


export type MovieSchemaConfig = MediaSchemaConfig<
    typeof movies,
    typeof moviesList,
    typeof moviesGenre,
    typeof moviesTags
>;


export const moviesConfig: MovieSchemaConfig = {
    mediaTable: movies,
    tagTable: moviesTags,
    listTable: moviesList,
    genreTable: moviesGenre,
    mediaType: MediaType.MOVIES,
    popularity: {
        eligibility: sql`${movies.voteCount} >= 1000`,
    },
    mediaList: {
        baseSelection: {
            mediaName: movies.name,
            imageCover: movies.imageCover,
            ...getTableColumns(moviesList),
        },
        filterDefinitions: {
            actors: createArrayFilterDef({
                argName: "actors",
                mediaTable: movies,
                entityTable: moviesActors,
                filterColumn: moviesActors.name,
            }),
            langs: createArrayFilterDef({
                argName: "langs",
                mediaTable: movies,
                filterColumn: movies.originalLanguage,
            }),
            directors: createArrayFilterDef({
                argName: "directors",
                mediaTable: movies,
                filterColumn: movies.directorName,
            }),
        },
        defaultStatus: Status.PLAN_TO_WATCH,
        defaultSortName: "Title A-Z",
        availableSorts: {
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
    communityActivityStats: {
        totalRedo: sql<number>`COALESCE(SUM(${moviesList.redo}), 0)`,
        totalSpecific: sql<number>`COALESCE(SUM(${moviesList.total}), 0)`,
    },
    apiProvider: {
        maxGenres: 5,
        name: "TMDB",
        mediaUrl: "https://www.themoviedb.org/movie/",
    },
    editableFields: [
        "originalName", "name", "directorName", "releaseDate", "duration", "synopsis",
        "budget", "revenue", "tagline", "originalLanguage", "lockStatus", "homepage",
    ],
    jobDefinitions: {
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
    tablesForDeletion: [moviesActors, moviesGenre, moviesTags],
    achievements: moviesAchievements,
};
