import {asc, desc, getTableColumns, sql} from "drizzle-orm";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {defineTvSchemaConfig} from "@/lib/types/media.config.types";
import {createArrayFilterDef} from "@/lib/server/domain/media/base/base.repository";
import {seriesAchievements} from "@/lib/server/domain/media/tv/series/achievements.seed";
import {series, seriesActors, seriesEpisodesPerSeason, seriesGenre, seriesList, seriesNetwork, seriesTags} from "@/lib/server/database/schema/media/series.schema";


export const seriesConfig = defineTvSchemaConfig({
    mediaTable: series,
    listTable: seriesList,
    genreTable: seriesGenre,
    tagTable: seriesTags,
    actorTable: seriesActors,
    networkTable: seriesNetwork,
    epsPerSeasonTable: seriesEpisodesPerSeason,
    mediaType: MediaType.SERIES,
    popularity: {
        eligibility: sql`${series.voteCount} >= 300`,
    },
    mediaList: {
        baseSelection: {
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
        filterDefinitions: {
            actors: createArrayFilterDef({
                argName: "actors",
                mediaTable: series,
                entityTable: seriesActors,
                filterColumn: seriesActors.name,
            }),
            networks: createArrayFilterDef({
                argName: "networks",
                mediaTable: series,
                entityTable: seriesNetwork,
                filterColumn: seriesNetwork.name,
            }),
            creators: createArrayFilterDef({
                argName: "creators",
                mediaTable: series,
                filterColumn: series.createdBy,
            }),
            langs: createArrayFilterDef({
                argName: "langs",
                mediaTable: series,
                filterColumn: series.originCountry,
            }),
        },
        defaultStatus: Status.PLAN_TO_WATCH,
        defaultSortName: "Title A-Z",
        availableSorts: {
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
    communityActivityStats: {
        totalRedo: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(value), 0) FROM json_each(${seriesList.redo2}))), 0)`,
        totalSpecific: sql<number>`COALESCE(SUM(${seriesList.total}), 0)`,
    },
    apiProvider: {
        maxGenres: 5,
        name: "TMDB",
        mediaUrl: "https://www.themoviedb.org/tv/",
    },
    editableFields: [
        "name", "originalName", "releaseDate", "lastAirDate", "homepage",
        "createdBy", "duration", "originCountry", "prodStatus", "synopsis", "lockStatus"
    ],
    jobDefinitions: {
        [JobType.ACTOR]: {
            sourceTable: seriesActors,
            nameColumn: seriesActors.name,
            mediaIdColumn: seriesActors.mediaId,
        },
        [JobType.CREATOR]: {
            mediaIdColumn: series.id,
            sourceTable: series,
            nameColumn: series.createdBy,
            postProcess: (results: { name: string | null }[]) => {
                return Array.from(
                    new Map(results
                        .filter((c) => c.name)
                        .flatMap((c) => c.name!.split(","))
                        .map((n) => n.trim())
                        .filter(Boolean)
                        .map((n) => [n, { name: n }])
                    ).values()
                );
            },
        },
        [JobType.PLATFORM]: {
            sourceTable: seriesNetwork,
            nameColumn: seriesNetwork.name,
            mediaIdColumn: seriesNetwork.mediaId,
        }
    },
    tablesForDeletion: [seriesEpisodesPerSeason, seriesNetwork, seriesActors, seriesGenre, seriesTags],
    achievements: seriesAchievements,
});


export type SeriesSchemaConfig = typeof seriesConfig;
