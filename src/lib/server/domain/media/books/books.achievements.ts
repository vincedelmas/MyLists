import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {books, booksAuthors, booksList} from "@/lib/server/database/schema";
import {BookSchemaConfig} from "@/lib/server/domain/media/books/books.config";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {booksAchievements} from "@/lib/server/domain/media/books/achievements.seed";
import {AchievementCalculation, AchievementCalculations, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {createAchievementQueries} from "@/lib/server/domain/media/base/base.achievements-queries";


export const createBooksAchievementCatalog = (config: BookSchemaConfig) => {
    const { listTable } = config;
    const queries = createAchievementQueries(config);

    const duration: AchievementCalculation = (achievement) => {
        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(books.pages, value) : lte(books.pages, value);

        const query = getDbClient()
            .select({
                userId: booksList.userId,
                value: count(booksList.mediaId).as("value"),
            })
            .from(booksList)
            .innerJoin(books, eq(booksList.mediaId, books.id));

        return queries.applyConditionsAndGroup(query, [eq(booksList.status, Status.COMPLETED), condition]);
    };

    const authors: AchievementCalculation = () => {
        const authorCounts = getDbClient()
            .select({
                userId: booksList.userId,
                count: count(booksList.mediaId).as("count"),
            })
            .from(booksList)
            .innerJoin(booksAuthors, eq(booksList.mediaId, booksAuthors.mediaId))
            .where(eq(booksList.status, Status.COMPLETED))
            .groupBy(booksList.userId, booksAuthors.name)
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

    const language: AchievementCalculation = () => {
        const query = getDbClient()
            .select({
                userId: booksList.userId,
                value: countDistinct(books.language).as("value"),
            })
            .from(booksList)
            .innerJoin(books, eq(booksList.mediaId, books.id));

        return queries.applyConditionsAndGroup(query, [eq(booksList.status, Status.COMPLETED)]);
    };

    return defineAchievementCatalog({
        mediaType: config.mediaType,
        definitions: booksAchievements,
        calculations: {
            lang_books: language,
            long_books: duration,
            short_books: duration,
            author_books: authors,
            crime_books: queries.countCompletedGenre,
            fantasy_books: queries.countCompletedGenre,
            classic_books: queries.countCompletedGenre,
            young_adult_books: queries.countCompletedGenre,
            rated_books: queries.countList(isNotNull(listTable.rating)),
            comment_books: queries.countList(isNotNull(listTable.comment)),
            completed_books: queries.countList(eq(listTable.status, Status.COMPLETED)),
        } satisfies AchievementCalculations<typeof booksAchievements>,
    });
};
