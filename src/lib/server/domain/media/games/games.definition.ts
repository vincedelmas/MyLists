import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {and, asc, desc, eq, getTableColumns, like, ne, sql} from "drizzle-orm";
import {defineMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {createArrayFilter, createListColOptionsLoader} from "@/lib/server/domain/media/base/media-list.query";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms, gamesTags} from "@/lib/server/database/schema/media/games.schema";


export const gamesDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.GAMES,
        coverDirectory: "games-covers",
    },
    repository: {
        tables: {
            mediaTable: games,
            listTable: gamesList,
            genreTable: gamesGenre,
            tagTable: gamesTags,
            deleteDependents: [gamesCompanies, gamesPlatforms, gamesGenre, gamesTags],
        },
        popularity: {
            eligibility: sql`${games.voteCount} >= 100`,
        },
        listQuery: {
            selection: {
                mediaName: games.name,
                imageCover: games.imageCover,
                ...getTableColumns(gamesList),
            },
            filters: {
                platforms: createArrayFilter({
                    argName: "platforms",
                    mediaTable: games,
                    filterColumn: gamesList.platform,
                }),
                companies: createArrayFilter({
                    argName: "companies",
                    mediaTable: games,
                    entityTable: gamesCompanies,
                    filterColumn: gamesCompanies.name,
                }),
            },
            filterOptions: {
                platforms: createListColOptionsLoader({
                    listTable: gamesList,
                    nameColumn: gamesList.platform,
                }),
            },
            defaultSort: "Playtime +",
            sorts: {
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
        stats: {
            community: {
                totalPlaytime: sql<number>`COALESCE(SUM(${gamesList.playtime}), 0)`,
            },
            allUsers: {
                timeSpent: sql<number>`COALESCE(SUM(${gamesList.playtime}), 0)`,
                totalSpecific: sql<number>`0`,
            },
            affinity: {
                developersStats: {
                    minRatingCount: 3,
                    metricIdCol: games.id,
                    metricTable: gamesCompanies,
                    metricNameCol: gamesCompanies.name,
                    mediaLinkCol: gamesCompanies.mediaId,
                    filters: [ne(gamesList.status, Status.PLAN_TO_PLAY), eq(gamesCompanies.developer, true)],
                },
                publishersStats: {
                    minRatingCount: 3,
                    metricIdCol: games.id,
                    metricTable: gamesCompanies,
                    metricNameCol: gamesCompanies.name,
                    mediaLinkCol: gamesCompanies.mediaId,
                    filters: [ne(gamesList.status, Status.PLAN_TO_PLAY), eq(gamesCompanies.publisher, true)],
                },
                platformsStats: {
                    metricIdCol: games.id,
                    metricTable: gamesList,
                    mediaLinkCol: gamesList.mediaId,
                    metricNameCol: gamesList.platform,
                    filters: [ne(gamesList.status, Status.PLAN_TO_PLAY)],
                },
                enginesStats: {
                    metricTable: games,
                    metricIdCol: games.id,
                    metricNameCol: games.gameEngine,
                    mediaLinkCol: gamesList.mediaId,
                    filters: [ne(gamesList.status, Status.PLAN_TO_PLAY)],
                },
                perspectivesStats: {
                    metricTable: games,
                    metricIdCol: games.id,
                    mediaLinkCol: gamesList.mediaId,
                    metricNameCol: games.playerPerspective,
                    filters: [ne(gamesList.status, Status.PLAN_TO_PLAY)],
                },
            },
        },
        jobs: {
            [JobType.CREATOR]: {
                sourceTable: gamesCompanies,
                nameColumn: gamesCompanies.name,
                mediaIdColumn: gamesCompanies.mediaId,
                getFilter: (name) => and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.developer, true)),
            },
            [JobType.PUBLISHER]: {
                sourceTable: gamesCompanies,
                nameColumn: gamesCompanies.name,
                mediaIdColumn: gamesCompanies.mediaId,
                getFilter: (name) => and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.publisher, true)),
            },
        },
    },
    service: {
        defaultStatus: Status.PLAN_TO_PLAY,
        editableFields: [
            "name", "gameEngine", "gameModes", "playerPerspective", "releaseDate", "synopsis",
            "hltbMainTime", "hltbMainAndExtraTime", "hltbTotalCompleteTime", "lockStatus",
        ],
        progressTotals: (state) => ({
            totalRedo: 0,
            totalSpecific: 0,
            timeSpent: state?.playtime ?? 0,
        }),
    },
    ingestion: {
        externalApiSource: ApiProviderType.IGDB,
        limits: {
            genres: 5,
        },
        refresh: {
            chunkSize: 500,
            staleAfterDays: 2,
        },
    },
    attribution: {
        name: "IGDB",
    },
});


export type GamesDefinition = typeof gamesDefinition;
