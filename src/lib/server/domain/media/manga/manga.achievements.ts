import {Status} from "@/lib/utils/enums";
import type {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {count, eq, gte, isNotNull, lte, max, sum} from "drizzle-orm";
import {manga, mangaAuthors, mangaList} from "@/lib/server/database/schema";
import type {MangaAchCodeName} from "@/lib/server/domain/media/manga/manga.types";
import type {MangaSchemaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {type AchievementHandler, BaseMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


export class MangaAchievements extends BaseMediaAchievements<MangaSchemaConfig, MangaAchCodeName> {
    protected readonly handlers: Record<MangaAchCodeName, AchievementHandler>;

    constructor(config: MangaSchemaConfig) {
        super(config);
        const { listTable } = config;

        this.handlers = {
            long_manga: this.duration.bind(this),
            author_manga: this.authors.bind(this),
            short_manga: this.duration.bind(this),
            chapter_manga: this.chapters.bind(this),
            seinen_manga: this.specificGenre.bind(this),
            publisher_manga: this.publishers.bind(this),
            hentai_manga: this.specificGenre.bind(this),
            shounen_manga: this.specificGenre.bind(this),
            rated_manga: this.count.bind(this, isNotNull(listTable.rating)),
            comment_manga: this.count.bind(this, isNotNull(listTable.comment)),
            completed_manga: this.count.bind(this, eq(listTable.status, Status.COMPLETED)),
        };
    }

    private duration(achievement: Achievement, userId?: number) {
        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(manga.chapters, value) : lte(manga.chapters, value);

        const baseCte = getDbClient()
            .select({
                userId: mangaList.userId,
                value: count(mangaList.mediaId).as("value"),
            })
            .from(mangaList)
            .innerJoin(manga, eq(mangaList.mediaId, manga.id));

        return this.applyWhereConditionsAndGrouping(baseCte, [eq(mangaList.status, Status.COMPLETED), condition], userId);
    }

    private authors(_achievement: Achievement, userId?: number) {
        const subQuery = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            })
            .from(mangaList)
            .innerJoin(mangaAuthors, eq(mangaList.mediaId, mangaAuthors.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(userId ? eq(mangaList.userId, userId) : mangaList.userId, mangaAuthors.name)
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

    private publishers(_achievement: Achievement, userId?: number) {
        const subQuery = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            })
            .from(mangaList)
            .innerJoin(manga, eq(manga.id, mangaList.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(userId ? eq(mangaList.userId, userId) : mangaList.userId, manga.publishers)
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

    private chapters(_achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: mangaList.userId,
                value: sum(mangaList.total).as("value"),
            })
            .from(mangaList);

        return this.applyWhereConditionsAndGrouping(baseCte, [], userId);
    }
}
