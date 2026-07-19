import {Status} from "@/lib/utils/enums";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {books, booksAuthors, booksList} from "@/lib/server/database/schema";
import {BooksAchCodeName} from "@/lib/server/domain/media/books/books.types";
import {BookSchemaConfig} from "@/lib/server/domain/media/books/books.config";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {AchievementHandler, BaseMediaAchievements,} from "@/lib/server/domain/media/base/base.achievements";


export class BooksAchievements extends BaseMediaAchievements<BookSchemaConfig, BooksAchCodeName> {
    protected readonly handlers: Record<BooksAchCodeName, AchievementHandler>;

    constructor(config: BookSchemaConfig) {
        super(config);
        const { listTable } = config;

        this.handlers = {
            lang_books: this.language.bind(this),
            long_books: this.duration.bind(this),
            short_books: this.duration.bind(this),
            author_books: this.authors.bind(this),
            crime_books: this.specificGenre.bind(this),
            fantasy_books: this.specificGenre.bind(this),
            classic_books: this.specificGenre.bind(this),
            young_adult_books: this.specificGenre.bind(this),
            rated_books: this.count.bind(this, isNotNull(listTable.rating)),
            comment_books: this.count.bind(this, isNotNull(listTable.comment)),
            completed_books: this.count.bind(this, eq(listTable.status, Status.COMPLETED)),
        };
    }

    private duration(achievement: Achievement, userId?: number) {
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

        return this.applyWhereConditionsAndGrouping(baseCte, [eq(booksList.status, Status.COMPLETED), condition], userId);
    }

    private authors(_achievement: Achievement, userId?: number) {
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
    }

    private language(_achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: booksList.userId,
                value: countDistinct(books.language).as("value"),
            })
            .from(booksList)
            .innerJoin(books, eq(booksList.mediaId, books.id));

        return this.applyWhereConditionsAndGrouping(baseCte, [eq(booksList.status, Status.COMPLETED)], userId);
    }
}
