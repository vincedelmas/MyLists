import {GamesPlatformsEnum, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {GamesAchCodeName} from "@/lib/server/domain/media/games/games.types";
import {games, gamesCompanies, gamesList} from "@/lib/server/database/schema";
import {GamesSchemaConfig} from "@/lib/server/domain/media/games/games.config";
import {gamesAchievements} from "@/lib/server/domain/media/games/achievements.seed";
import {AchievementHandler, createMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";
import {and, count, countDistinct, eq, gte, inArray, isNotNull, like, lte, max, notInArray, sql} from "drizzle-orm";


export const createGamesAchievements = (config: GamesSchemaConfig) => {
    return createMediaAchievements({
        config,
        definitions: gamesAchievements,
        createHandlers: ({ count: countAchievement, specificGenre, applyWhereConditionsAndGrouping }) => {
            const { listTable } = config;

            const gameMode: AchievementHandler = (achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        value: count(gamesList.id).as("value"),
                    }).from(gamesList)
                    .innerJoin(games, eq(gamesList.mediaId, games.id));

                return applyWhereConditionsAndGrouping(baseCte, [
                    like(games.gameModes, `%${achievement.value}%`),
                    notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
                ], userId);
            };

            const timeSpent: AchievementHandler = (_achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        value: sql`SUM(${gamesList.playtime}) / 60`.as("value"),
                    }).from(gamesList);

                return applyWhereConditionsAndGrouping(baseCte, [], userId);
            };

            const platform: AchievementHandler = (_achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        value: countDistinct(gamesList.platform).as("value"),
                    }).from(gamesList);

                return applyWhereConditionsAndGrouping(
                    baseCte,
                    [notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY])],
                    userId,
                );
            };

            const specificPlatform: AchievementHandler = (achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        value: count(gamesList.mediaId).as("value"),
                    }).from(gamesList);

                return applyWhereConditionsAndGrouping(baseCte, [
                    eq(gamesList.platform, achievement.value as GamesPlatformsEnum),
                    notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
                ], userId);
            };

            const duration: AchievementHandler = (achievement, userId) => {
                const value = parseInt(achievement.value!, 10);
                const isLong = achievement.codeName.includes("long");

                const baseCte = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        value: count(gamesList.mediaId).as("value"),
                    }).from(gamesList)
                    .innerJoin(games, eq(gamesList.mediaId, games.id));

                return applyWhereConditionsAndGrouping(baseCte, [
                    isLong ? gte(gamesList.playtime, value) : lte(gamesList.playtime, value),
                    inArray(gamesList.status, [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER]),
                ], userId);
            };

            const company: AchievementHandler = (achievement, userId) => {
                const isDeveloper = achievement.value === "developer";

                const subQuery = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        count: count(gamesList.mediaId).as("count"),
                    })
                    .from(gamesList)
                    .innerJoin(gamesCompanies, eq(gamesList.mediaId, gamesCompanies.mediaId))
                    .where(and(
                        notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
                        isDeveloper ? eq(gamesCompanies.developer, true) : eq(gamesCompanies.publisher, true),
                    )).groupBy(userId ? eq(gamesList.userId, userId) : gamesList.userId, gamesCompanies.name)
                    .as("sub");

                return getDbClient()
                    .select({
                        userId: subQuery.userId,
                        value: max(subQuery.count).as("value"),
                    }).from(subQuery)
                    .groupBy(subQuery.userId)
                    .as("calculation");
            };

            const perspective: AchievementHandler = (achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: gamesList.userId,
                        value: count(gamesList.mediaId).as("value"),
                    }).from(gamesList)
                    .innerJoin(games, eq(gamesList.mediaId, games.id));

                return applyWhereConditionsAndGrouping(baseCte, [
                    eq(games.playerPerspective, achievement.value as string),
                    notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
                ], userId);
            };

            return {
                long_games: duration,
                short_games: duration,
                platform_games: platform,
                developer_games: company,
                publisher_games: company,
                log_hours_games: timeSpent,
                pc_games: specificPlatform,
                multiplayer_games: gameMode,
                first_person_games: perspective,
                hack_slash_games: specificGenre,
                rated_games: countAchievement(isNotNull(listTable.rating)),
                comment_games: countAchievement(isNotNull(listTable.comment)),
                completed_games: countAchievement(eq(listTable.status, Status.COMPLETED)),
            } satisfies Record<GamesAchCodeName, AchievementHandler>;
        },
    });
}
