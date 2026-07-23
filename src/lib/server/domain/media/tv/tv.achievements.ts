import {getDbClient} from "@/lib/server/database/async-storage";
import {AchievementDifficulty, MediaType, Status} from "@/lib/utils/enums";
import {count, countDistinct, eq, gte, isNotNull, lte, max, ne} from "drizzle-orm";
import {createAchievementQueries} from "@/lib/server/domain/media/base/achievements-queries";
import {AnimeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {SeriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


type TvDefinition = AnimeServerDefinition | SeriesServerDefinition;


export const createTvAchievementCatalog = (definition: TvDefinition) => {
    const { identity, repository } = definition;
    const { listTable } = repository.tables;
    const queries = createAchievementQueries(repository);

    const duration: AchievementCalculation = (achievement) => {
        const { mediaTable, listTable } = repository.tables;

        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(mediaTable.totalEpisodes, value) : lte(mediaTable.totalEpisodes, value);

        const query = getDbClient()
            .select({
                userId: listTable.userId,
                value: count(listTable.mediaId).as("value"),
            })
            .from(listTable)
            .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id));

        return queries.applyConditionsAndGroup(query, [eq(listTable.status, Status.COMPLETED), condition]);
    };

    const network: AchievementCalculation = () => {
        const { listTable, networkTable } = repository.tables;

        const query = getDbClient()
            .select({
                userId: listTable.userId,
                value: countDistinct(networkTable.name).as("value"),
            })
            .from(listTable)
            .innerJoin(networkTable, eq(listTable.mediaId, networkTable.mediaId));

        return queries.applyConditionsAndGroup(query, [ne(listTable.status, Status.PLAN_TO_WATCH)]);
    };

    const actor: AchievementCalculation = () => {
        const { listTable, actorTable } = repository.tables;

        const actorCounts = getDbClient()
            .select({
                userId: listTable.userId,
                count: count(listTable.mediaId).as("count"),
            })
            .from(listTable)
            .innerJoin(actorTable, eq(listTable.mediaId, actorTable.mediaId))
            .where(eq(listTable.status, Status.COMPLETED))
            .groupBy(listTable.userId, actorTable.name)
            .as("actor_counts");

        return getDbClient()
            .select({
                userId: actorCounts.userId,
                value: max(actorCounts.count).as("value"),
            })
            .from(actorCounts)
            .groupBy(actorCounts.userId)
            .as("calculation");
    };

    if (identity.mediaType === MediaType.ANIME) {
        return defineAchievementCatalog({
            mediaType: identity.mediaType,
            entries: {
                completed_anime: {
                    name: 'Binge No Jutsu!',
                    description: "Awarded for completing anime, because who needs sleep when there's just one more episode?",
                    tiers: [
                        { criteria: { count: 20 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 50 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 120 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 200 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countList(eq(listTable.status, Status.COMPLETED)),
                },
                rated_anime: {
                    name: 'Rate My Waifu',
                    description: 'Awarded for rating anime, because judging anime is serious business...',
                    tiers: [
                        { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 30 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 50 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 100 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countList(isNotNull(listTable.rating)),
                },
                comment_anime: {
                    name: 'Weeb-splainer',
                    description: 'Awarded for commenting anime, because sometimes a 3-paragraph rant about plot holes is necessary.',
                    tiers: [
                        { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 30 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countList(isNotNull(listTable.comment)),
                },
                short_anime: {
                    name: 'Short King',
                    description: "Awarded for watching anime with less than 20 episodes, because this anime will never have another season!",
                    value: 20,
                    tiers: [
                        { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 8 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 12 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: duration,
                },
                long_anime: {
                    name: 'Filler Arc Survivor',
                    description: 'Awarded for watching anime with more than 200 episodes, because you powered through the 50 flashbacks and 20 beach episodes.',
                    value: 200,
                    tiers: [
                        { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 7 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 9 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: duration,
                },
                shonen_anime: {
                    name: 'Shonen Showdown!',
                    description:
                        "Awarded for watching Shonen anime, because power-ups and friendship speeches never get old.",
                    value: 'Shounen',
                    tiers: [
                        { criteria: { count: 7 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 12 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 17 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 22 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countCompletedGenre,
                },
                seinen_anime: {
                    name: 'Seinen Sage!',
                    description: "Awarded for completing Seinen anime, because you're too deep into complex plots to enjoy slice-of-life fluff.",
                    value: 'Seinen',
                    tiers: [
                        { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 8 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 12 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countCompletedGenre,
                },
                network_anime: {
                    name: 'Network Lurker',
                    description: 'Awarded for watching anime from different networks, because consistency is key, or maybe your subscription just auto-renewed.',
                    tiers: [
                        { criteria: { count: 8 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 16 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 20 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 30 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: network,
                },
                actor_anime: {
                    name: 'Seiyuu Sensei',
                    description: 'Awarded for watching anime featuring the same voice actor, because now you can spot that voice faster than an anime power-up scream.',
                    tiers: [
                        { criteria: { count: 8 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 12 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 15 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 22 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: actor,
                }
            },
        });
    }
    else {
        return defineAchievementCatalog({
            mediaType: identity.mediaType,
            entries: {
                completed_series: {
                    name: "Couch Potato",
                    description: "Awarded for completing series, because finishing what you started is a true feat!",
                    tiers: [
                        { criteria: { count: 30 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 100 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 175 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 250 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countList(eq(listTable.status, Status.COMPLETED)),
                },
                rated_series: {
                    name: "TV Rater",
                    description: "Awarded for rating series, sharing your opinions with the world.",
                    tiers: [
                        { criteria: { count: 20 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 50 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 100 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 150 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countList(isNotNull(listTable.rating)),
                },
                short_series: {
                    name: "Episode Economist",
                    description: "Awarded for completing series with less than 8 episodes, proving than good things come in small packages!",
                    value: 8,
                    tiers: [
                        { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 15 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 30 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: duration,
                },
                long_series: {
                    name: "Marathon Maverick",
                    description: "Awarded for completing series with over 150 episodes, because who needs sleep anyway?",
                    value: 150,
                    tiers: [
                        { criteria: { count: 1 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 3 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 7 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: duration,
                },
                comedy_series: {
                    name: "Laugh Track Legend",
                    description: "Awarded for completing comedy series, because laughter is the best medicine!",
                    value: "Comedy",
                    tiers: [
                        { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 40 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 70 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countCompletedGenre,
                },
                drama_series: {
                    name: "Drama Queen",
                    description: "Awarded for completing drama series, embracing the emotional roller-coaster!",
                    value: "Drama",
                    tiers: [
                        { criteria: { count: 15 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 35 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 60 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 80 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: queries.countCompletedGenre,
                },
                network_series: {
                    name: "Channel Surfer",
                    description: "Awarded for watching series from different networks, mastering the remote like a pro!",
                    tiers: [
                        { criteria: { count: 15 }, difficulty: AchievementDifficulty.BRONZE },
                        { criteria: { count: 25 }, difficulty: AchievementDifficulty.SILVER },
                        { criteria: { count: 40 }, difficulty: AchievementDifficulty.GOLD },
                        { criteria: { count: 60 }, difficulty: AchievementDifficulty.PLATINUM },
                    ],
                    calculate: network,
                }
            },
        });
    }
};
