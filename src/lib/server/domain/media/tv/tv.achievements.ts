import {Status} from "@/lib/utils/enums";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {TvAchCodeName} from "@/lib/server/domain/media/tv/tv.types";
import {AnimeSchemaConfig} from "@/lib/server/domain/media/tv/anime/anime.config";
import {count, countDistinct, eq, gte, isNotNull, lte, max, ne} from "drizzle-orm";
import {SeriesSchemaConfig} from "@/lib/server/domain/media/tv/series/series.config";
import {AchievementHandler, BaseMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


type TvConfig = AnimeSchemaConfig | SeriesSchemaConfig;


export class TvAchievements extends BaseMediaAchievements<TvConfig, TvAchCodeName> {
    protected readonly handlers: Record<TvAchCodeName, AchievementHandler>;

    constructor(config: TvConfig) {
        super(config);
        const { listTable } = config;

        this.handlers = {
            actor_anime: this.actor.bind(this),
            long_anime: this.duration.bind(this),
            short_anime: this.duration.bind(this),
            network_anime: this.network.bind(this),
            shonen_anime: this.specificGenre.bind(this),
            seinen_anime: this.specificGenre.bind(this),
            rated_anime: this.count.bind(this, isNotNull(listTable.rating)),
            comment_anime: this.count.bind(this, isNotNull(listTable.comment)),
            completed_anime: this.count.bind(this, eq(listTable.status, Status.COMPLETED)),

            long_series: this.duration.bind(this),
            short_series: this.duration.bind(this),
            network_series: this.network.bind(this),
            drama_series: this.specificGenre.bind(this),
            comedy_series: this.specificGenre.bind(this),
            rated_series: this.count.bind(this, isNotNull(listTable.rating)),
            completed_series: this.count.bind(this, eq(listTable.status, Status.COMPLETED)),
        };
    }

    private duration(achievement: Achievement, userId?: number) {
        const { mediaTable, listTable } = this.config;
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

        return this.applyWhereConditionsAndGrouping(baseCte, [eq(listTable.status, Status.COMPLETED), condition], userId);
    }

    private network(_achievement: Achievement, userId?: number) {
        const { listTable, networkTable } = this.config;
        const baseCte = getDbClient()
            .select({
                userId: listTable.userId,
                value: countDistinct(networkTable.name).as("value"),
            })
            .from(listTable)
            .innerJoin(networkTable, eq(listTable.mediaId, networkTable.mediaId));

        return this.applyWhereConditionsAndGrouping(baseCte, [ne(listTable.status, Status.PLAN_TO_WATCH)], userId);
    }

    private actor(_achievement: Achievement, userId?: number) {
        const { listTable, actorTable } = this.config;
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
    }
}
