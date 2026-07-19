import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {count, eq, gte, isNotNull, lte, max, sum} from "drizzle-orm";
import {manga, mangaAuthors, mangaList} from "@/lib/server/database/schema";
import type {MangaSchemaConfig} from "@/lib/server/domain/media/manga/manga.config";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements.seed";
import {AchievementCalculation, AchievementCalculations, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {createAchievementQueries} from "@/lib/server/domain/media/base/base.achievements-queries";


export const createMangaAchievementCatalog = (config: MangaSchemaConfig) => {
    const { listTable } = config;
    const queries = createAchievementQueries(config);

    const duration: AchievementCalculation = (achievement) => {
        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(manga.chapters, value) : lte(manga.chapters, value);

        const query = getDbClient()
            .select({
                userId: mangaList.userId,
                value: count(mangaList.mediaId).as("value"),
            })
            .from(mangaList)
            .innerJoin(manga, eq(mangaList.mediaId, manga.id));

        return queries.applyConditionsAndGroup(query, [eq(mangaList.status, Status.COMPLETED), condition]);
    };

    const authors: AchievementCalculation = () => {
        const authorCounts = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            })
            .from(mangaList)
            .innerJoin(mangaAuthors, eq(mangaList.mediaId, mangaAuthors.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(mangaList.userId, mangaAuthors.name)
            .as("author_counts");

        return getDbClient()
            .select({
                userId: authorCounts.userId,
                value: max(authorCounts.count).as("value"),
            })
            .from(authorCounts)
            .groupBy(authorCounts.userId)
            .as("calculation");
    };

    const publishers: AchievementCalculation = () => {
        const publisherCounts = getDbClient()
            .select({
                userId: mangaList.userId,
                count: count(mangaList.mediaId).as("count"),
            })
            .from(mangaList)
            .innerJoin(manga, eq(manga.id, mangaList.mediaId))
            .where(eq(mangaList.status, Status.COMPLETED))
            .groupBy(mangaList.userId, manga.publishers)
            .as("publisher_counts");

        return getDbClient()
            .select({
                userId: publisherCounts.userId,
                value: max(publisherCounts.count).as("value"),
            })
            .from(publisherCounts)
            .groupBy(publisherCounts.userId)
            .as("calculation");
    };

    const chapters: AchievementCalculation = () => {
        const query = getDbClient()
            .select({
                userId: mangaList.userId,
                value: sum(mangaList.total).as("value"),
            })
            .from(mangaList);

        return queries.applyConditionsAndGroup(query, []);
    };

    return defineAchievementCatalog({
        mediaType: config.mediaType,
        definitions: mangaAchievements,
        calculations: {
            long_manga: duration,
            author_manga: authors,
            short_manga: duration,
            chapter_manga: chapters,
            publisher_manga: publishers,
            seinen_manga: queries.countCompletedGenre,
            hentai_manga: queries.countCompletedGenre,
            shounen_manga: queries.countCompletedGenre,
            rated_manga: queries.countList(isNotNull(listTable.rating)),
            comment_manga: queries.countList(isNotNull(listTable.comment)),
            completed_manga: queries.countList(eq(listTable.status, Status.COMPLETED)),
        } satisfies AchievementCalculations<typeof mangaAchievements>,
    });
};
