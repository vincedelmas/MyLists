import {AchievementCategory, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {booksAuthors, booksList} from "@/lib/server/database/schema";
import {and, count, eq, gt, gte, isNotNull, lte, sql} from "drizzle-orm";
import {BookServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {createAchievementQueries, pickTopPerUser} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


export const createBooksAchievementCatalog = (definition: BookServerDefinition) => {
    const { identity, repository } = definition;
    const { listTable } = repository.tables;
    const queries = createAchievementQueries(repository);

    const completedBooks = queries.countList(eq(listTable.status, Status.COMPLETED));

    const shortBooks: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: booksList.userId, value: count(booksList.mediaId) })
            .from(booksList)
            .where(and(
                eq(booksList.status, Status.COMPLETED),
                gt(booksList.customPages, 0),
                lte(booksList.customPages, 150),
                queries.userFilter(userId),
            )).groupBy(booksList.userId)
            .all();
    };

    const longBooks: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: booksList.userId, value: count(booksList.mediaId) })
            .from(booksList)
            .where(and(
                eq(booksList.status, Status.COMPLETED),
                gte(booksList.customPages, 800),
                queries.userFilter(userId),
            )).groupBy(booksList.userId)
            .all();
    };

    const authors: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: booksList.userId,
                label: booksAuthors.name,
                count: count(booksList.mediaId),
            }).from(booksList)
            .innerJoin(booksAuthors, eq(booksList.mediaId, booksAuthors.mediaId))
            .where(and(eq(booksList.status, Status.COMPLETED), queries.userFilter(userId)))
            .groupBy(booksList.userId, booksAuthors.name)
            .all();

        return pickTopPerUser(rows);
    };

    const pagesRead: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: booksList.userId,
                value: sql<number>`COALESCE(SUM(${booksList.total}), 0)`,
            }).from(booksList)
            .where(queries.userFilter(userId))
            .groupBy(booksList.userId)
            .all();
    };

    return defineAchievementCatalog({
        mediaType: identity.mediaType,
        category: AchievementCategory.BOOKS,
        entries: {
            books_first: {
                target: 1,
                shape: "circle",
                name: "Page One",
                pattern: "rings",
                icon: "open-book",
                triggers: ["status"],
                calculate: completedBooks,
                description: "Complete your first book. Every library starts with one spine.",
            },
            books_10: {
                name: "Shelf Starter",
                description: "Complete 10 books. A proper reading streak is underway.",
                icon: "book-cover",
                shape: "circle",
                pattern: "rings",
                target: 10,
                triggers: ["status"],
                calculate: completedBooks,
            },
            books_25: {
                name: "Bookworm",
                description: "Complete 25 books. Your bedside table tower is mostly under control.",
                icon: "book-pile",
                shape: "octagon",
                pattern: "rays",
                target: 25,
                triggers: ["status"],
                calculate: completedBooks,
            },
            books_100: {
                name: "Bibliophile Conqueror",
                description: "Complete 100 books. A hundred new worlds conquered.",
                icon: "bookshelf",
                shape: "shield",
                pattern: "rays",
                target: 100,
                triggers: ["status"],
                calculate: completedBooks,
            },
            books_rated_25: {
                name: "Rating Wizard",
                description: "Rate 25 books, turning hidden gems into personal recommendations.",
                icon: "stars",
                shape: "circle",
                pattern: "dots",
                target: 25,
                triggers: ["rating"],
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            books_commented_15: {
                name: "Commentary Bard",
                description: "Write notes or reviews on 15 books.",
                icon: "quill",
                shape: "circle",
                pattern: "dots",
                target: 15,
                triggers: ["comment"],
                calculate: queries.countNonEmptyComment(),
            },
            books_author_5: {
                name: "Author Aficionado",
                description: "Complete 5 books by the same author. Devoted to their literary magic.",
                icon: "book-cover",
                shape: "hex",
                pattern: "dots",
                target: 5,
                triggers: ["status"],
                calculate: authors,
            },
            books_pages_10000: {
                name: "Ten Thousand Pages",
                description: "Read 10,000 total pages across your book library.",
                icon: "scroll",
                shape: "octagon",
                pattern: "rings",
                target: 10000,
                triggers: ["progress", "status", "redo", "book-details"],
                calculate: pagesRead,
            },
            books_short_5: {
                name: "Quick Read Guru",
                description: "Complete 5 books with 150 pages or fewer. Concise storytelling at its best.",
                icon: "stopwatch",
                shape: "circle",
                pattern: "rings",
                target: 5,
                triggers: ["status", "book-details"],
                calculate: shortBooks,
            },
            books_long_3: {
                name: "Doorstopper",
                description: "Complete 3 books of 800+ pages. True literary stamina.",
                icon: "spell-book",
                shape: "octagon",
                pattern: "rays",
                target: 3,
                triggers: ["status", "book-details"],
                calculate: longBooks,
            },
            books_genres_6: {
                name: "Genre Wanderer",
                description: "Complete books across 6 different genres. Every shelf in the library explored.",
                icon: "dragon",
                shape: "hex",
                pattern: "rays",
                target: 6,
                triggers: ["status"],
                calculate: queries.countDistinctGenres(),
            },
        },
    });
};
