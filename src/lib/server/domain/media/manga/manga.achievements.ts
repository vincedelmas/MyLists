import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {count, eq, gte, isNotNull, lte, max, sum} from "drizzle-orm";
import {manga, mangaAuthors, mangaList} from "@/lib/server/database/schema";
import type {MangaAchCodeName} from "@/lib/server/domain/media/manga/manga.types";
import type {MangaSchemaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements.seed";
import {type AchievementHandler, createMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


export const createMangaAchievements = (config: MangaSchemaConfig) => {
    return createMediaAchievements({
        config,
        definitions: mangaAchievements,
        createHandlers: ({ count: countAchievement, specificGenre, applyWhereConditionsAndGrouping }) => {
            const { listTable } = config;

            const duration: AchievementHandler = (achievement, userId) => {
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

                return applyWhereConditionsAndGrouping(
                    baseCte,
                    [eq(mangaList.status, Status.COMPLETED), condition],
                    userId,
                );
            };

            const authors: AchievementHandler = (_achievement, userId) => {
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
            };

            const publishers: AchievementHandler = (_achievement, userId) => {
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
            };

            const chapters: AchievementHandler = (_achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: mangaList.userId,
                        value: sum(mangaList.total).as("value"),
                    })
                    .from(mangaList);

                return applyWhereConditionsAndGrouping(baseCte, [], userId);
            };

            return {
                long_manga: duration,
                author_manga: authors,
                short_manga: duration,
                chapter_manga: chapters,
                seinen_manga: specificGenre,
                publisher_manga: publishers,
                hentai_manga: specificGenre,
                shounen_manga: specificGenre,
                rated_manga: countAchievement(isNotNull(listTable.rating)),
                comment_manga: countAchievement(isNotNull(listTable.comment)),
                completed_manga: countAchievement(eq(listTable.status, Status.COMPLETED)),
            } satisfies Record<MangaAchCodeName, AchievementHandler>;
        },
    });
}
