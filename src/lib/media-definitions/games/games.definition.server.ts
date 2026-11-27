import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {getDbClient} from "@/lib/server/database/async-storage";
import {and, eq, getTableColumns, inArray, like, ne, sql} from "drizzle-orm";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {normalizeGamePlatform} from "@/lib/server/domain/media/games/platforms";
import {defineMediaFilterDefinitions} from "@/lib/server/domain/media/base/media-filters.queries";
import {ApiProviderType, GamesPlatformsEnum, MediaCategory, MediaType, Status} from "@/lib/utils/enums";
import {gamesMyListsCSVRowSchema, refineGameAchievementsPair} from "@/lib/server/domain/media/games/games.types";
import {createMediaListSorts, getCommonMediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {games, gamesCompanies, gamesGenre, gamesList, gamesPlatforms, gamesTags} from "@/lib/server/database/schema/media/games.schema";


const tables = {
    mediaTable: games,
    listTable: gamesList,
    genreTable: gamesGenre,
    tagTable: gamesTags,
};


const sortColumns = {
    ...getCommonMediaSortColumns(tables),
    playtime: gamesList.playtime,
    providerRating: games.voteAverage,
    achievements: sql`CASE
        WHEN ${gamesList.achievementsUnlocked} IS NOT NULL AND ${gamesList.achievementsTotal} > 0
        THEN CAST(${gamesList.achievementsUnlocked} AS REAL) / ${gamesList.achievementsTotal}
        ELSE NULL
    END`,
};


export const gamesServerDefinition = defineServerMediaDefinition({
    listImport: {
        csvRowSchema: gamesMyListsCSVRowSchema,
        validateCsvRow: refineGameAchievementsPair,
        optionalHeaders: ["achievementsUnlocked", "achievementsTotal"],
    },
    identity: {
        mediaType: MediaType.GAMES,
        coverDirectory: "games-covers",
    },
    repository: {
        sortColumns,
        filters: defineMediaFilterDefinitions(gamesDefinition, tables, {
            platforms: {
                filterColumn: gamesList.platform,
                optionsTable: gamesList,
            },
            companies: {
                searchable: true,
                entityTable: gamesCompanies,
                filterColumn: gamesCompanies.name,
            },
        }),
        tables,
        popularity: {
            eligibility: sql`${games.voteCount} >= 100`,
        },
        listQuery: {
            selection: {
                mediaName: games.name,
                imageCover: games.imageCover,
                hltbMainTime: games.hltbMainTime,
                ...getTableColumns(gamesList),
            },
            defaultSort: getMediaSortLabel(gamesDefinition, gamesDefinition.sorting.default),
            sorts: createMediaListSorts(gamesDefinition, sortColumns, games.id),
        },
        communityActivity: {
            aggregates: {
                totalPlaytime: sql<number>`COALESCE(SUM(${gamesList.playtime}), 0)`,
            },
        },
        categories: {
            [MediaCategory.PLATFORM]: {
                sourceTable: gamesPlatforms,
                nameColumn: gamesPlatforms.name,
                mediaIdColumn: gamesPlatforms.mediaId,
                getFilter: (name) => {
                    if (!Object.values<string>(GamesPlatformsEnum).includes(name)) {
                        return eq(gamesPlatforms.name, name);
                    }

                    const aliases = getDbClient()
                        .selectDistinct({ name: gamesPlatforms.name })
                        .from(gamesPlatforms).all()
                        .filter(platform => normalizeGamePlatform(platform.name) === name)
                        .map(platform => platform.name);

                    return inArray(gamesPlatforms.name, [name, ...aliases]);
                },
            },
            [MediaCategory.ENGINE]: {
                matchExact: true,
                sourceTable: games,
                mediaIdColumn: games.id,
                nameColumn: games.gameEngine,
            },
            [MediaCategory.PERSPECTIVE]: {
                matchExact: true,
                sourceTable: games,
                mediaIdColumn: games.id,
                nameColumn: games.playerPerspective,
            },
            [MediaCategory.CREATOR]: {
                sourceTable: gamesCompanies,
                nameColumn: gamesCompanies.name,
                mediaIdColumn: gamesCompanies.mediaId,
                getFilter: (name) => {
                    return and(like(gamesCompanies.name, `%${name}%`), eq(gamesCompanies.developer, true))!;
                },
            },
            [MediaCategory.PUBLISHER]: {
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
                filters: [ne(gamesList.status, Status.PLANNED), eq(gamesCompanies.developer, true)],
            },
            publishersStats: {
                minRatingCount: 3,
                metricIdCol: games.id,
                metricTable: gamesCompanies,
                metricNameCol: gamesCompanies.name,
                mediaLinkCol: gamesCompanies.mediaId,
                filters: [ne(gamesList.status, Status.PLANNED), eq(gamesCompanies.publisher, true)],
            },
            platformsStats: {
                metricIdCol: games.id,
                metricTable: gamesList,
                mediaLinkCol: gamesList.mediaId,
                metricNameCol: gamesList.platform,
                filters: [ne(gamesList.status, Status.PLANNED)],
            },
            enginesStats: {
                metricTable: games,
                metricIdCol: games.id,
                metricNameCol: games.gameEngine,
                mediaLinkCol: gamesList.mediaId,
                filters: [ne(gamesList.status, Status.PLANNED)],
            },
            perspectivesStats: {
                metricTable: games,
                metricIdCol: games.id,
                mediaLinkCol: gamesList.mediaId,
                metricNameCol: games.playerPerspective,
                filters: [ne(gamesList.status, Status.PLANNED)],
            },
        }),
    },
    service: {
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
