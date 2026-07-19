import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaSchemaConfig} from "@/lib/types/media.config.types";
import {and, asc, desc, eq, getTableColumns, like, sql} from "drizzle-orm";
import {createArrayFilterDef} from "@/lib/server/domain/media/base/base.repository";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms, gamesTags} from "@/lib/server/database/schema/media/games.schema";


export const gamesConfig = defineMediaSchemaConfig({
    mediaTable: games,
    listTable: gamesList,
    genreTable: gamesGenre,
    tagTable: gamesTags,
    mediaType: MediaType.GAMES,
    popularity: {
        eligibility: sql`${games.voteCount} >= 100`,
    },
    mediaList: {
        baseSelection: {
            mediaName: games.name,
            imageCover: games.imageCover,
            ...getTableColumns(gamesList),
        },
        filterDefinitions: {
            platforms: createArrayFilterDef({
                argName: "platforms",
                mediaTable: games,
                filterColumn: gamesList.platform,
            }),
            companies: createArrayFilterDef({
                argName: "companies",
                mediaTable: games,
                entityTable: gamesCompanies,
                filterColumn: gamesCompanies.name,
            }),
        },
        defaultStatus: Status.PLAN_TO_PLAY,
        defaultSortName: "Playtime +",
        availableSorts: {
            "Title A-Z": asc(games.name),
            "Title Z-A": desc(games.name),
            "Release Date +": [desc(games.releaseDate), asc(games.name)],
            "Release Date -": [sql`${games.releaseDate} ASC NULLS LAST`, asc(games.name)],
            "IGDB Rating +": [desc(games.voteAverage), asc(games.name)],
            "IGDB Rating -": [asc(games.voteAverage), asc(games.name)],
            "Recently Added": [desc(gamesList.addedAt), asc(games.name)],
            "Recently Modified": [desc(gamesList.lastUpdated), asc(games.name)],
            "Rating +": [desc(gamesList.rating), asc(games.name)],
            "Rating -": [asc(gamesList.rating), asc(games.name)],
            "Playtime +": [desc(gamesList.playtime), asc(games.name)],
            "Playtime -": [asc(gamesList.playtime), asc(games.name)],
        },
    },
    communityActivityStats: {
        totalPlaytime: sql<number>`COALESCE(SUM(${gamesList.playtime}), 0)`,
    },
    apiProvider: {
        maxGenres: 5,
        name: "IGDB",
        mediaUrl: null, // in db igdbUrl
    },
    editableFields: [
        "name", "gameEngine", "gameModes", "playerPerspective", "releaseDate", "synopsis",
        "hltbMainTime", "hltbMainAndExtraTime", "hltbTotalCompleteTime", "lockStatus",
    ],
    jobDefinitions: {
        [JobType.CREATOR]: {
            sourceTable: gamesCompanies,
            nameColumn: gamesCompanies.name,
            mediaIdColumn: gamesCompanies.mediaId,
            getFilter: (name) => and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.developer, true))
        },
        [JobType.PUBLISHER]: {
            sourceTable: gamesCompanies,
            nameColumn: gamesCompanies.name,
            mediaIdColumn: gamesCompanies.mediaId,
            getFilter: (name) => and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.publisher, true))
        }
    },
    tablesForDeletion: [gamesCompanies, gamesPlatforms, gamesGenre, gamesTags],
});


export type GamesSchemaConfig = typeof gamesConfig;
