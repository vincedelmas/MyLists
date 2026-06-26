import {asc, desc, getTableColumns, sql} from "drizzle-orm";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {TvSchemaConfig} from "@/lib/types/media.config.types";
import {createArrayFilterDef} from "@/lib/server/domain/media/base/base.repository";
import {animeAchievements} from "@/lib/server/domain/media/tv/anime/achievements.seed";
import {anime, animeActors, animeEpisodesPerSeason, animeGenre, animeList, animeNetwork, animeTags} from "@/lib/server/database/schema/media/anime.schema";


export type AnimeSchemaConfig = TvSchemaConfig<
    typeof anime,
    typeof animeList,
    typeof animeGenre,
    typeof animeTags,
    typeof animeActors,
    typeof animeNetwork,
    typeof animeEpisodesPerSeason
>;


export const animeConfig: AnimeSchemaConfig = {
    mediaTable: anime,
    listTable: animeList,
    genreTable: animeGenre,
    tagTable: animeTags,
    actorTable: animeActors,
    networkTable: animeNetwork,
    epsPerSeasonTable: animeEpisodesPerSeason,
    mediaType: MediaType.ANIME,
    mediaList: {
        baseSelection: {
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
        filterDefinitions: {
            actors: createArrayFilterDef({
                argName: "actors",
                mediaTable: anime,
                entityTable: animeActors,
                filterColumn: animeActors.name,
            }),
            networks: createArrayFilterDef({
                argName: "networks",
                mediaTable: anime,
                entityTable: animeNetwork,
                filterColumn: animeNetwork.name,
            }),
            creators: createArrayFilterDef({
                argName: "creators",
                mediaTable: anime,
                filterColumn: anime.createdBy,
            }),
            langs: createArrayFilterDef({
                argName: "langs",
                mediaTable: anime,
                filterColumn: anime.originCountry,
            }),
        },
        defaultStatus: Status.PLAN_TO_WATCH,
        defaultSortName: "Title A-Z",
        availableSorts: {
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
    communityActivityStats: {
        totalRedo: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(value), 0) FROM json_each(${animeList.redo2}))), 0)`,
        totalSpecific: sql<number>`COALESCE(SUM(${animeList.total}), 0)`,
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
            sourceTable: animeActors,
            nameColumn: animeActors.name,
            mediaIdColumn: animeActors.mediaId,
        },
        [JobType.CREATOR]: {
            sourceTable: anime,
            mediaIdColumn: anime.id,
            nameColumn: anime.createdBy,
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
            sourceTable: animeNetwork,
            nameColumn: animeNetwork.name,
            mediaIdColumn: animeNetwork.mediaId,
        }
    },
    tablesForDeletion: [animeEpisodesPerSeason, animeNetwork, animeActors, animeGenre, animeTags],
    achievements: animeAchievements,
};
