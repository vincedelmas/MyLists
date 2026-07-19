import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvAchCodeName} from "@/lib/server/domain/media/tv/tv.types";
import {AnimeSchemaConfig} from "@/lib/server/domain/media/tv/anime/anime.config";
import {count, countDistinct, eq, gte, isNotNull, lte, max, ne} from "drizzle-orm";
import {SeriesSchemaConfig} from "@/lib/server/domain/media/tv/series/series.config";
import {animeAchievements} from "@/lib/server/domain/media/tv/anime/achievements.seed";
import {seriesAchievements} from "@/lib/server/domain/media/tv/series/achievements.seed";
import {AchievementHandler, createMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


type TvConfig = AnimeSchemaConfig | SeriesSchemaConfig;


export const createTvAchievements = (config: TvConfig) => {
    return createMediaAchievements({
        config,
        definitions: config.mediaType === MediaType.ANIME ? animeAchievements : seriesAchievements,
        createHandlers: ({ count: countAchievement, specificGenre, applyWhereConditionsAndGrouping }) => {
            const { listTable } = config;

            const duration: AchievementHandler = (achievement, userId) => {
                const { mediaTable, listTable } = config;
                const value = parseInt(achievement.value!, 10);
                const isLong = achievement.codeName.includes("long");
                const condition = isLong ? gte(mediaTable.totalEpisodes, value) : lte(mediaTable.totalEpisodes, value);

                const baseCte = getDbClient()
                    .select({
                        userId: listTable.userId,
                        value: count(listTable.mediaId).as("value"),
                    })
                    .from(listTable)
                    .innerJoin(mediaTable, eq(listTable.mediaId, mediaTable.id));

                return applyWhereConditionsAndGrouping(baseCte, [eq(listTable.status, Status.COMPLETED), condition], userId);
            };

            const network: AchievementHandler = (_achievement, userId) => {
                const { listTable, networkTable } = config;
                const baseCte = getDbClient()
                    .select({
                        userId: listTable.userId,
                        value: countDistinct(networkTable.name).as("value"),
                    })
                    .from(listTable)
                    .innerJoin(networkTable, eq(listTable.mediaId, networkTable.mediaId));

                return applyWhereConditionsAndGrouping(baseCte, [ne(listTable.status, Status.PLAN_TO_WATCH)], userId);
            };

            const actor: AchievementHandler = (_achievement, userId) => {
                const { listTable, actorTable } = config;
                const subQuery = getDbClient()
                    .select({
                        userId: listTable.userId,
                        count: count(listTable.mediaId).as("count"),
                    })
                    .from(listTable)
                    .innerJoin(actorTable, eq(listTable.mediaId, actorTable.mediaId))
                    .where(eq(listTable.status, Status.COMPLETED))
                    .groupBy(userId ? eq(listTable.userId, userId) : listTable.userId, actorTable.name)
                    .as("sub");

                return getDbClient()
                    .select({
                        userId: subQuery.userId,
                        value: max(subQuery.count).as("value"),
                    })
                    .from(subQuery)
                    .groupBy(subQuery.userId)
                    .as("calculation");
            };

            return {
                actor_anime: actor,
                long_anime: duration,
                short_anime: duration,
                network_anime: network,
                shonen_anime: specificGenre,
                seinen_anime: specificGenre,
                rated_anime: countAchievement(isNotNull(listTable.rating)),
                comment_anime: countAchievement(isNotNull(listTable.comment)),
                completed_anime: countAchievement(eq(listTable.status, Status.COMPLETED)),

                long_series: duration,
                short_series: duration,
                network_series: network,
                drama_series: specificGenre,
                comedy_series: specificGenre,
                rated_series: countAchievement(isNotNull(listTable.rating)),
                completed_series: countAchievement(eq(listTable.status, Status.COMPLETED)),
            } satisfies Record<TvAchCodeName, AchievementHandler>;
        },
    });
}
