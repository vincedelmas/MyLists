import {GamesPlatformsEnum, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {games, gamesCompanies, gamesList} from "@/lib/server/database/schema";
import {GamesSchemaConfig} from "@/lib/server/domain/media/games/games.config";
import {gamesAchievements} from "@/lib/server/domain/media/games/achievements.seed";
import {and, count, countDistinct, eq, gte, inArray, isNotNull, like, lte, max, notInArray, sql} from "drizzle-orm";
import {AchievementCalculation, AchievementCalculations, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {createAchievementQueries} from "@/lib/server/domain/media/base/base.achievements-queries";


export const createGamesAchievementCatalog = (config: GamesSchemaConfig) => {
    const { listTable } = config;
    const queries = createAchievementQueries(config);

    const gameMode: AchievementCalculation = (achievement) => {
        const query = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.id).as("value"),
            })
            .from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id));

        return queries.applyConditionsAndGroup(query, [
            like(games.gameModes, `%${achievement.value}%`),
            notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
        ]);
    };

    const timeSpent: AchievementCalculation = () => {
        const query = getDbClient()
            .select({
                userId: gamesList.userId,
                value: sql`SUM(${gamesList.playtime}) / 60`.as("value"),
            })
            .from(gamesList);

        return queries.applyConditionsAndGroup(query, []);
    };

    const platform: AchievementCalculation = () => {
        const query = getDbClient()
            .select({
                userId: gamesList.userId,
                value: countDistinct(gamesList.platform).as("value"),
            })
            .from(gamesList);

        return queries.applyConditionsAndGroup(
            query,
            [notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY])],
        );
    };

    const specificPlatform: AchievementCalculation = (achievement) => {
        const query = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.mediaId).as("value"),
            })
            .from(gamesList);

        return queries.applyConditionsAndGroup(query, [
            eq(gamesList.platform, achievement.value as GamesPlatformsEnum),
            notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
        ]);
    };

    const duration: AchievementCalculation = (achievement) => {
        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");

        const query = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.mediaId).as("value"),
            })
            .from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id));

        return queries.applyConditionsAndGroup(query, [
            isLong ? gte(gamesList.playtime, value) : lte(gamesList.playtime, value),
            inArray(gamesList.status, [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER]),
        ]);
    };

    const company: AchievementCalculation = (achievement) => {
        const isDeveloper = achievement.value === "developer";

        const companyCounts = getDbClient()
            .select({
                userId: gamesList.userId,
                count: count(gamesList.mediaId).as("count"),
            })
            .from(gamesList)
            .innerJoin(gamesCompanies, eq(gamesList.mediaId, gamesCompanies.mediaId))
            .where(and(
                notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
                isDeveloper ? eq(gamesCompanies.developer, true) : eq(gamesCompanies.publisher, true),
            ))
            .groupBy(gamesList.userId, gamesCompanies.name)
            .as("company_counts");

        return getDbClient()
            .select({
                userId: companyCounts.userId,
                value: max(companyCounts.count).as("value"),
            })
            .from(companyCounts)
            .groupBy(companyCounts.userId)
            .as("calculation");
    };

    const perspective: AchievementCalculation = (achievement) => {
        const query = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.mediaId).as("value"),
            })
            .from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id));

        return queries.applyConditionsAndGroup(query, [
            eq(games.playerPerspective, achievement.value as string),
            notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
        ]);
    };

    return defineAchievementCatalog({
        mediaType: config.mediaType,
        definitions: gamesAchievements,
        calculations: {
            long_games: duration,
            short_games: duration,
            platform_games: platform,
            developer_games: company,
            publisher_games: company,
            log_hours_games: timeSpent,
            pc_games: specificPlatform,
            multiplayer_games: gameMode,
            first_person_games: perspective,
            hack_slash_games: queries.countCompletedGenre,
            rated_games: queries.countList(isNotNull(listTable.rating)),
            comment_games: queries.countList(isNotNull(listTable.comment)),
            completed_games: queries.countList(eq(listTable.status, Status.COMPLETED)),
        } satisfies AchievementCalculations<typeof gamesAchievements>,
    });
};
