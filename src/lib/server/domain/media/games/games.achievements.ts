import {Achievement} from "@/lib/types/achievements.types";
import {GamesPlatformsEnum, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {GamesAchCodeName} from "@/lib/server/domain/media/games/games.types";
import {games, gamesCompanies, gamesList} from "@/lib/server/database/schema";
import {GamesSchemaConfig} from "@/lib/server/domain/media/games/games.config";
import {AchievementHandler, BaseMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";
import {and, count, countDistinct, eq, gte, inArray, isNotNull, like, lte, max, notInArray, sql} from "drizzle-orm";


export class GamesAchievements extends BaseMediaAchievements<GamesSchemaConfig, GamesAchCodeName> {
    protected readonly handlers: Record<GamesAchCodeName, AchievementHandler>;

    constructor(config: GamesSchemaConfig) {
        super(config);

        const { listTable } = config;
        this.handlers = {
            long_games: this.duration.bind(this),
            short_games: this.duration.bind(this),
            platform_games: this.platform.bind(this),
            developer_games: this.company.bind(this),
            publisher_games: this.company.bind(this),
            log_hours_games: this.timeSpent.bind(this),
            pc_games: this.specificPlatform.bind(this),
            multiplayer_games: this.gameMode.bind(this),
            first_person_games: this.perspective.bind(this),
            hack_slash_games: this.specificGenre.bind(this),
            rated_games: this.count.bind(this, isNotNull(listTable.rating)),
            comment_games: this.count.bind(this, isNotNull(listTable.comment)),
            completed_games: this.count.bind(this, eq(listTable.status, Status.COMPLETED)),
        };
    }

    private gameMode(achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.id).as("value"),
            }).from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id));

        return this.applyWhereConditionsAndGrouping(baseCte, [
            like(games.gameModes, `%${achievement.value}%`),
            notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
        ], userId);
    }

    private timeSpent(_achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: gamesList.userId,
                value: sql`SUM(${gamesList.playtime}) / 60`.as("value"),
            }).from(gamesList);

        return this.applyWhereConditionsAndGrouping(baseCte, [], userId);
    }

    private platform(_achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: gamesList.userId,
                value: countDistinct(gamesList.platform).as("value"),
            }).from(gamesList);

        return this.applyWhereConditionsAndGrouping(
            baseCte,
            [notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY])],
            userId,
        );
    }

    private specificPlatform(achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.mediaId).as("value"),
            }).from(gamesList);

        return this.applyWhereConditionsAndGrouping(baseCte, [
            eq(gamesList.platform, achievement.value as GamesPlatformsEnum),
            notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
        ], userId);
    }

    private duration(achievement: Achievement, userId?: number) {
        const value = parseInt(achievement.value!, 10);
        const isLong = achievement.codeName.includes("long");

        const baseCte = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.mediaId).as("value"),
            }).from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id));

        return this.applyWhereConditionsAndGrouping(baseCte, [
            isLong ? gte(gamesList.playtime, value) : lte(gamesList.playtime, value),
            inArray(gamesList.status, [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER]),
        ], userId);
    }

    private company(achievement: Achievement, userId?: number) {
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
    }

    private perspective(achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: gamesList.userId,
                value: count(gamesList.mediaId).as("value"),
            }).from(gamesList)
            .innerJoin(games, eq(gamesList.mediaId, games.id));

        return this.applyWhereConditionsAndGrouping(baseCte, [
            eq(games.playerPerspective, achievement.value as string),
            notInArray(gamesList.status, [Status.DROPPED, Status.PLAN_TO_PLAY]),
        ], userId);
    }
}
