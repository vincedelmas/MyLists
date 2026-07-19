import {getDbClient} from "@/lib/server/database/async-storage";
import {games, gamesCompanies, gamesList} from "@/lib/server/database/schema";
import {GamesSchemaConfig} from "@/lib/server/domain/media/games/games.config";
import {AchievementDifficulty, GamesPlatformsEnum, Status} from "@/lib/utils/enums";
import {createAchievementQueries} from "@/lib/server/domain/media/base/base.achievements-queries";
import {and, count, countDistinct, eq, gte, inArray, isNotNull, like, lte, max, notInArray, sql} from "drizzle-orm";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


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
        entries: {
            completed_games: {
                name: "Gaming Completionist",
                description: "Awarded for completing games, because finishing a game is the only thing that counts in the endless cycle of gaming.",
                tiers: [
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 150 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 250 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(eq(listTable.status, Status.COMPLETED)),
            },
            rated_games: {
                name: "Critique Commander",
                description: "Awarded for rating games, because everyone needs to know that that boss fight was so unfair!",
                tiers: [
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 40 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 80 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 120 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            comment_games: {
                name: "Commentary Crusader",
                description: "Awarded for commenting games, because your opinions on loot boxes are too hot to keep to yourself!",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 30 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(isNotNull(listTable.comment)),
            },
            developer_games: {
                name: "Devoted Fan",
                description: "Awarded for playing games from the same developers, showing your unwavering loyalty to your favorite game creators!",
                value: "developer",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: company,
            },
            publisher_games: {
                name: "Publisher Pal",
                description: "Awarded for playing games from the same publishers, because you've sworn an oath to defend their titles from all foes!",
                value: "publisher",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: company,
            },
            first_person_games: {
                name: "First-Person Pro",
                description:
                    "Awarded for playing First Person Perspective games, because you prefer to see the world through your character's eyes—and their shaky hands.",
                value: "First person",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 40 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 60 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: perspective,
            },
            hack_slash_games: {
                name: "Slash & Dash",
                description: "Awarded for completing Hack & Slash games, because sometimes, mashing buttons is the best form of therapy!.",
                value: "Hack and Slash",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: queries.countCompletedGenre,
            },
            multiplayer_games: {
                name: "Multiplayer Maestro",
                description: "Awarded for playing multiplayer games, because teamwork makes the dream work—until it doesn’t!",
                value: "Multiplayer",
                tiers: [
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 40 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: gameMode,
            },
            log_hours_games: {
                name: "Time Sink Extraordinaire",
                description: "Awarded for logging hours, because you’ve officially become a time lord in the gaming universe!",
                tiers: [
                    { criteria: { count: 200 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 800 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 2000 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 5000 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: timeSpent,
            },
            platform_games: {
                name: "Platform Hopper",
                description: "Awarded for playing games on different platforms, proving you're a true adventurer who leaves no console unturned!",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: platform,
            },
            pc_games: {
                name: "PC Mastermind",
                description: "Awarded for playing games on PC, because you like modding your way through every title!",
                value: "PC",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: specificPlatform,
            },
            short_games: {
                name: "Short Game Sage",
                description: "Awarded for completing games under 5 hours, because you appreciate the beauty of bite-sized adventures that pack a punch!",
                value: 300,
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: duration,
            },
            long_games: {
                name: "Epic Adventurer",
                description: "Awarded for completing games above 100 hours, because your gaming journey is basically an epic saga at this point!",
                value: 6000,
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: duration,
            }
        },
    });
};
