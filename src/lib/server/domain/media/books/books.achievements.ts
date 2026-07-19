import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {books, booksAuthors, booksList} from "@/lib/server/database/schema";
import {BooksAchCodeName} from "@/lib/server/domain/media/books/books.types";
import {BookSchemaConfig} from "@/lib/server/domain/media/books/books.config";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {booksAchievements} from "@/lib/server/domain/media/books/achievements.seed";
import {AchievementHandler, createMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


export const createBooksAchievements = (config: BookSchemaConfig) => {
    return createMediaAchievements({
        config,
        definitions: booksAchievements,
        createHandlers: ({ count: countAchievement, specificGenre, applyWhereConditionsAndGrouping }) => {
            const { listTable } = config;

            const duration: AchievementHandler = (achievement, userId) => {
                const value = Number(achievement.value);
                const isLong = achievement.codeName.includes("long");
                const condition = isLong ? gte(books.pages, value) : lte(books.pages, value);

                const baseCte = getDbClient()
                    .select({
                        userId: booksList.userId,
                        value: count(booksList.mediaId).as("value"),
                    })
                    .from(booksList)
                    .innerJoin(books, eq(booksList.mediaId, books.id));

                return applyWhereConditionsAndGrouping(baseCte, [eq(booksList.status, Status.COMPLETED), condition], userId);
            };

            const authors: AchievementHandler = (_achievement, userId) => {
                const subQuery = getDbClient()
                    .select({
                        userId: booksList.userId,
                        count: count(booksList.mediaId).as("count"),
                    })
                    .from(booksList)
                    .innerJoin(booksAuthors, eq(booksList.mediaId, booksAuthors.mediaId))
                    .where(eq(booksList.status, Status.COMPLETED))
                    .groupBy(userId ? eq(booksList.userId, userId) : booksList.userId, booksAuthors.name)
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

            const language: AchievementHandler = (_achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: booksList.userId,
                        value: countDistinct(books.language).as("value"),
                    })
                    .from(booksList)
                    .innerJoin(books, eq(booksList.mediaId, books.id));

                return applyWhereConditionsAndGrouping(baseCte, [eq(booksList.status, Status.COMPLETED)], userId);
            };

            return {
                lang_books: language,
                long_books: duration,
                short_books: duration,
                author_books: authors,
                crime_books: specificGenre,
                fantasy_books: specificGenre,
                classic_books: specificGenre,
                young_adult_books: specificGenre,
                rated_books: countAchievement(isNotNull(listTable.rating)),
                comment_books: countAchievement(isNotNull(listTable.comment)),
                completed_books: countAchievement(eq(listTable.status, Status.COMPLETED)),
            } satisfies Record<BooksAchCodeName, AchievementHandler>;
        },
    });
}
