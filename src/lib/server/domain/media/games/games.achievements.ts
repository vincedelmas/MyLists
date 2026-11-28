import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementCategory, Status} from "@/lib/utils/enums";
import {games, gamesCompanies, gamesList} from "@/lib/server/database/schema";
import {gamesDefinition} from "@/lib/media-definitions/games/games.definition";
import {GamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {and, asc, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, lte, notInArray, sql} from "drizzle-orm";
import {createAchievementQueries, pickTopPerUser, summarizeLabeledRows} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


export const createGamesAchievementCatalog = (definition: GamesServerDefinition) => {
    const { identity, repository } = definition;
    const { listTable } = repository.tables;
    const { minutesPerInputUnit } = gamesDefinition.progress.timing;
    const queries = createAchievementQueries(repository);

    const completedGames = queries.countList(eq(listTable.status, Status.COMPLETED));

    const timeSpentHours: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: gamesList.userId,
                value: sql<number>`CAST(COALESCE(SUM(${gamesList.playtime}), 0) AS REAL) / ${minutesPerInputUnit}`,
            })
            .from(gamesList)
            .where(queries.userFilter(userId))
            .groupBy(gamesList.userId)
            .all();
    };

    const platforms: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: gamesList.userId,
                value: countDistinct(gamesList.platform),
            })
            .from(gamesList)
            .where(and(
                isNotNull(gamesList.platform),
                notInArray(gamesList.status, [Status.DROPPED, Status.PLANNED]),
                queries.userFilter(userId),
            ))
            .groupBy(gamesList.userId)
            .all();
    };

    const shortGames: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: gamesList.userId, value: count(gamesList.mediaId) })
            .from(gamesList)
            .where(and(
                eq(gamesList.status, Status.COMPLETED),
                gt(gamesList.playtime, 0),
                lte(gamesList.playtime, 300),
                queries.userFilter(userId),
            ))
            .groupBy(gamesList.userId)
            .all();
    };

    const longGames: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: gamesList.userId, value: count(gamesList.mediaId) })
            .from(gamesList)
            .where(and(
                gte(gamesList.playtime, 6000),
                inArray(gamesList.status, [Status.IN_PROGRESS, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER]),
                queries.userFilter(userId),
            ))
            .groupBy(gamesList.userId)
            .all();
    };

    const developer: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: gamesList.userId,
                label: gamesCompanies.name,
                count: count(gamesList.mediaId),
            })
            .from(gamesList)
            .innerJoin(gamesCompanies, eq(gamesList.mediaId, gamesCompanies.mediaId))
            .where(and(
                notInArray(gamesList.status, [Status.DROPPED, Status.PLANNED]),
                eq(gamesCompanies.developer, true),
                queries.userFilter(userId),
            ))
            .groupBy(gamesList.userId, gamesCompanies.name)
            .all();

        return pickTopPerUser(rows);
    };

    const perfectGames: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: gamesList.userId,
                label: games.name,
            })
            .from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id))
            .where(and(
                isNotNull(gamesList.achievementsTotal),
                gte(gamesList.achievementsTotal, 1),
                eq(gamesList.achievementsUnlocked, gamesList.achievementsTotal),
                queries.userFilter(userId),
            ))
            .orderBy(desc(gamesList.lastUpdated), asc(games.name))
            .all();

        return summarizeLabeledRows(rows);
    };

    return defineAchievementCatalog({
        category: AchievementCategory.GAMES,
        mediaType: identity.mediaType,
        entries: {
            games_first: {
                name: "Press Start",
                description: "Complete your very first game. The tutorial is officially over.",
                icon: "gamepad",
                shape: "circle",
                pattern: "rings",
                target: 1,
                triggers: ["status"],
                calculate: completedGames,
            },
            games_10: {
                name: "Quest Log Clearing",
                description: "Complete 10 games. Credits rolled, next adventure queued.",
                icon: "joystick",
                shape: "circle",
                pattern: "rings",
                target: 10,
                triggers: ["status"],
                calculate: completedGames,
            },
            games_25: {
                name: "Side-Quest Regular",
                description: "Complete 25 games without getting permanently sidetracked by collectibles.",
                icon: "controller",
                shape: "octagon",
                pattern: "rays",
                target: 25,
                triggers: ["status"],
                calculate: completedGames,
            },
            games_100: {
                name: "Gaming Completionist",
                description: "Complete 100 games, conquering the endless backlog one boss fight at a time.",
                icon: "crown",
                shape: "shield",
                pattern: "rays",
                target: 100,
                triggers: ["status"],
                calculate: completedGames,
            },
            games_rated_25: {
                name: "Critique Commander",
                description: "Rate 25 games, because everyone needs to know that boss fight was unfair.",
                icon: "stars",
                shape: "circle",
                pattern: "dots",
                target: 25,
                triggers: ["rating"],
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            games_commented_15: {
                name: "Hot Take Hero",
                description: "Comment on 15 games. Your opinions on frame rates and endings can't be contained.",
                icon: "chat",
                shape: "circle",
                pattern: "dots",
                target: 15,
                triggers: ["comment"],
                calculate: queries.countNonEmptyComment(),
            },
            games_hours_500: {
                name: "Time Sink Extraordinaire",
                description: "Log 500 hours of total playtime across your gaming library.",
                icon: "clockwork",
                shape: "octagon",
                pattern: "rings",
                target: 500,
                triggers: ["progress", "status"],
                calculate: timeSpentHours,
            },
            games_hours_2500: {
                name: "No-Life Legend",
                description: "Log 2,500 hours of playtime. That's over 100 full days in virtual worlds.",
                icon: "castle",
                shape: "shield",
                pattern: "rays",
                target: 2500,
                triggers: ["progress", "status"],
                calculate: timeSpentHours,
            },
            games_developer_5: {
                name: "Devoted Fan",
                description: "Play 5 games by the same developer. Unwavering studio loyalty.",
                icon: "swords",
                shape: "hex",
                pattern: "rays",
                target: 5,
                triggers: ["status"],
                calculate: developer,
            },
            games_platforms_5: {
                name: "Platform Hopper",
                description: "Play games across 5 different platforms, leaving no console unturned.",
                icon: "joystick",
                shape: "hex",
                pattern: "rings",
                target: 5,
                triggers: ["platform", "status"],
                calculate: platforms,
            },
            games_short_8: {
                name: "Bite-Sized Quest",
                description: "Complete 8 games with 5 hours or less logged. Short adventures that pack a punch.",
                icon: "stopwatch",
                shape: "circle",
                pattern: "rings",
                target: 8,
                triggers: ["progress", "status"],
                calculate: shortGames,
            },
            games_long_5: {
                name: "100-Hour Club",
                description: "Put 100+ hours into 5 different games. Your save files are basically epics.",
                icon: "hourglass",
                shape: "octagon",
                pattern: "rays",
                target: 5,
                triggers: ["progress", "status"],
                calculate: longGames,
            },
            games_genres_8: {
                name: "All-Rounder",
                description: "Play games across 8 different genres, from cozy indies to boss rushes.",
                icon: "compass",
                shape: "hex",
                pattern: "dots",
                target: 8,
                triggers: ["status"],
                calculate: queries.countDistinctGenres(notInArray(gamesList.status, [Status.DROPPED, Status.PLANNED])),
            },
            games_perfect_1: {
                name: "Achievement-ception",
                description: "Reach 100% in-game achievements on a tracked game. An achievement for achievements.",
                icon: "trophy",
                shape: "octagon",
                pattern: "rays",
                target: 1,
                triggers: ["game-achievements"],
                calculate: perfectGames,
            },
            games_perfect_10: {
                name: "Trophy Hunter",
                description: "Reach 100% in-game achievements on 10 tracked games. Certified completionist.",
                icon: "diamond-trophy",
                shape: "shield",
                pattern: "rays",
                target: 10,
                triggers: ["game-achievements"],
                calculate: perfectGames,
            },
        },
    });
};
