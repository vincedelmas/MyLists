import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {and, eq, getTableColumns, like, ne, sql} from "drizzle-orm";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {createArrayFilter, createListColOptionsLoader} from "@/lib/server/domain/media/base/media-list.queries";
import {createMediaListSorts, getCommonMediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms, gamesTags} from "@/lib/server/database/schema/media/games.schema";


const sortColumns = {
    ...getCommonMediaSortColumns({ mediaTable: games, listTable: gamesList }),
    playtime: gamesList.playtime,
    providerRating: games.voteAverage,
};


export const gamesServerDefinition = defineServerMediaDefinition({
    identity: {
        mediaType: MediaType.GAMES,
        coverDirectory: "games-covers",
    },
    repository: {
        sortColumns,
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
            defaultSort: getMediaSortLabel(gamesDefinition, gamesDefinition.sorting.default),
            sorts: createMediaListSorts(gamesDefinition, sortColumns, games.id),
        },
        communityActivity: {
            aggregates: {
                totalPlaytime: sql<number>`COALESCE(SUM(${gamesList.playtime}), 0)`,
            },
        },
        jobs: {
            [JobType.CREATOR]: {
                sourceTable: gamesCompanies,
                nameColumn: gamesCompanies.name,
                mediaIdColumn: gamesCompanies.mediaId,
                getFilter: (name) => {
                    return and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.developer, true))!;
                },
            },
            [JobType.PUBLISHER]: {
                sourceTable: gamesCompanies,
                nameColumn: gamesCompanies.name,
                mediaIdColumn: gamesCompanies.mediaId,
                getFilter: (name) => {
                    return and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.publisher, true))!;
                },
            },
        },
    },
    statistics: {
        allUsers: {
            totalSpecific: sql<number>`0`,
            timeSpent: sql<number>`COALESCE(SUM(${gamesList.playtime}), 0)`,
        },
        affinity: defineAffinityDefinitions(gamesDefinition, {
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
        }),
    },
    service: {
        defaultStatus: Status.PLAN_TO_PLAY,
        editableFields: [
            "name", "gameEngine", "gameModes", "playerPerspective", "releaseDate", "synopsis",
            "hltbMainTime", "hltbMainAndExtraTime", "hltbTotalCompleteTime", "lockStatus", "imageCover",
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


export type GamesServerDefinition = typeof gamesServerDefinition;
