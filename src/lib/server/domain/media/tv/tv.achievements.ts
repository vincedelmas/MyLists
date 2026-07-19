import {MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {AnimeSchemaConfig} from "@/lib/server/domain/media/tv/anime/anime.config";
import {count, countDistinct, eq, gte, isNotNull, lte, max, ne} from "drizzle-orm";
import {SeriesSchemaConfig} from "@/lib/server/domain/media/tv/series/series.config";
import {animeAchievements} from "@/lib/server/domain/media/tv/anime/achievements.seed";
import {seriesAchievements} from "@/lib/server/domain/media/tv/series/achievements.seed";
import {AchievementCalculation, AchievementCalculations, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {createAchievementQueries} from "@/lib/server/domain/media/base/base.achievements-queries";


type TvConfig = AnimeSchemaConfig | SeriesSchemaConfig;


export const createTvAchievementCatalog = (config: TvConfig) => {
    const { listTable } = config;
    const queries = createAchievementQueries(config);

    const duration: AchievementCalculation = (achievement) => {
        const { mediaTable, listTable } = config;
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
        const { listTable, networkTable } = config;
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
        const { listTable, actorTable } = config;
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

    if (config.mediaType === MediaType.ANIME) {
        return defineAchievementCatalog({
            mediaType: config.mediaType,
            definitions: animeAchievements,
            calculations: {
                actor_anime: actor,
                long_anime: duration,
                short_anime: duration,
                network_anime: network,
                shonen_anime: queries.countCompletedGenre,
                seinen_anime: queries.countCompletedGenre,
                rated_anime: queries.countList(isNotNull(listTable.rating)),
                comment_anime: queries.countList(isNotNull(listTable.comment)),
                completed_anime: queries.countList(eq(listTable.status, Status.COMPLETED)),
            } satisfies AchievementCalculations<typeof animeAchievements>,
        });
    }
    else {
        return defineAchievementCatalog({
            mediaType: config.mediaType,
            definitions: seriesAchievements,
            calculations: {
                long_series: duration,
                short_series: duration,
                network_series: network,
                drama_series: queries.countCompletedGenre,
                comedy_series: queries.countCompletedGenre,
                rated_series: queries.countList(isNotNull(listTable.rating)),
                completed_series: queries.countList(eq(listTable.status, Status.COMPLETED)),
            } satisfies AchievementCalculations<typeof seriesAchievements>,
        });
    }
};
