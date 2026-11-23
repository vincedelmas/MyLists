import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, Status, UpdateType} from "@/lib/utils/enums";
import {AdminRepository} from "@/lib/server/domain/admin/admin.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as ReturnType<typeof drizzle> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));


describe("AdminRepository book merging", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle({ client: sqlite });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        dbContext.db.insert(schema.user).values([
            { id: 1, name: "alice", email: "alice@example.invalid", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
            { id: 2, name: "bob", email: "bob@example.invalid", emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ]).run();

        dbContext.db.insert(schema.books).values([
            { id: 10, apiId: "work-a", name: "Dune", imageCover: "dune-en.jpg", pages: 412, language: "en", publishers: "Chilton", releaseDate: "1965-08-01" },
            { id: 20, apiId: "work-b", name: "Dune (Edition Française)", imageCover: "dune-fr.jpg", pages: 720, language: "fr", publishers: "Robert Laffont", releaseDate: "2020-01-01" },
        ]).run();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined as unknown as ReturnType<typeof drizzle>;
    });

    it("groups matching titles and author sets, then suggests the book with the most users", async () => {
        dbContext.db.insert(schema.books).values([
            { id: 30, apiId: "work-c", name: "Duné!", pages: 320, imageCover: "default.jpg" },
            { id: 40, apiId: "work-d", name: "Dune", pages: 300, imageCover: "default.jpg" },
        ]).run();
        dbContext.db.insert(schema.booksAuthors).values([
            { mediaId: 10, name: "Frank Herbert" },
            { mediaId: 10, name: "John Schoenherr" },
            { mediaId: 20, name: "Frank Herbert" },
            { mediaId: 20, name: "John Schoenherr" },
            { mediaId: 30, name: "John Schoenherr" },
            { mediaId: 30, name: "FRANK HERBERT" },
            { mediaId: 40, name: "Frank Herbert" },
        ]).run();
        dbContext.db.insert(schema.booksList).values({
            userId: 1, mediaId: 30, status: Status.PLANNED, customTitle: "Duné!", customPages: 320,
        }).run();

        const result = await AdminRepository.getBooksForAdminMerge({ view: "duplicates", search: "frank herbert" });
        expect(result).toMatchObject({
            kind: "duplicates",
            total: 1,
            items: [{ books: [{ id: 30, usersCount: 1 }, { id: 10, usersCount: 0 }] }],
        });

        AdminRepository.mergeBooks(30, [10]);
        const afterMerge = await AdminRepository.getBooksForAdminMerge({ view: "duplicates" });
        expect(afterMerge).toMatchObject({ total: 0, items: [] });
    });

    it("lists authors by book count and browses titles outside the duplicate queue", async () => {
        dbContext.db.insert(schema.books).values({
            id: 30, apiId: "work-c", name: "Dune Messiah", pages: 256, imageCover: "default.jpg",
        }).run();
        dbContext.db.insert(schema.booksAuthors).values([
            { mediaId: 10, name: "Frank Herbert" },
            { mediaId: 10, name: "John Schoenherr" },
            { mediaId: 10, name: "Adrian Author" },
            { mediaId: 10, name: "Zoe Author" },
            { mediaId: 20, name: "Frank Herbert" },
            { mediaId: 20, name: "Adrian Author" },
            { mediaId: 20, name: "Zoe Author" },
            { mediaId: 30, name: "Zoe Author" },
        ]).run();

        const authorDirectory = await AdminRepository.getBooksForAdminMerge({ view: "authors" });
        expect(authorDirectory).toMatchObject({
            kind: "authors",
            total: 3,
            items: [
                { name: "Zoe Author", bookCount: 3 },
                { name: "Adrian Author", bookCount: 2 },
                { name: "Frank Herbert", bookCount: 2 },
            ],
        });

        const authors = await AdminRepository.getBooksForAdminMerge({ view: "authors", search: "HERBERT" });
        expect(authors).toMatchObject({
            kind: "authors",
            total: 1,
            items: [{ key: "frank herbert", name: "Frank Herbert", bookCount: 2 }],
        });

        const authorBooks = await AdminRepository.getBooksForAdminMerge({
            view: "authors", author: "frank herbert", page: 2, perPage: 1,
        });
        expect(authorBooks).toMatchObject({
            kind: "author-books",
            author: "Frank Herbert",
            total: 2,
            items: [{ id: 20, name: "Dune (Edition Française)" }],
        });

        const catalog = await AdminRepository.getBooksForAdminMerge({ view: "catalog", search: "#30" });
        expect(catalog).toMatchObject({
            kind: "catalog",
            total: 1,
            items: [{ id: 30, name: "Dune Messiah" }],
        });
    });

    it("merges duplicate books while preserving user edition snapshots and resolving overlaps", () => {
        // Alice only has the French edition (book 20) with no explicit custom cover
        dbContext.db.insert(schema.booksList).values({
            userId: 1,
            mediaId: 20,
            status: Status.COMPLETED,
            actualPage: 720,
            total: 720,
            rating: 9,
            customTitle: "Dune (Edition Française)",
            customPages: 720,
            customPublisher: "Robert Laffont",
            customReleaseDate: "2020-01-01",
            customLanguage: "fr",
            customCover: null,
        }).run();

        // Bob has BOTH book 10 (target) and book 20 (duplicate)
        dbContext.db.insert(schema.booksList).values([
            {
                userId: 2,
                mediaId: 10,
                status: Status.COMPLETED,
                actualPage: 412,
                total: 412,
                rating: 8,
                customTitle: "Dune",
                customPages: 412,
                customPublisher: "Chilton",
                customReleaseDate: "1965-08-01",
                customLanguage: "en",
                customCover: null,
            },
            {
                userId: 2,
                mediaId: 20,
                status: Status.PLANNED,
                actualPage: 0,
                total: 0,
                customTitle: "Dune (Edition Française)",
                customPages: 720,
                customPublisher: "Robert Laffont",
                customReleaseDate: "2020-01-01",
                customLanguage: "fr",
                customCover: null,
            },
        ]).run();

        // Tags, monthly activity (including same-month overlap for Bob), collection (with both books), update history, highlighted media
        const bobListRows = dbContext.db.select().from(schema.booksList).where(eq(schema.booksList.userId, 2)).all();
        const [tag] = dbContext.db.insert(schema.mediaTags).values({ userId: 2, mediaType: MediaType.BOOKS, name: "Sci-Fi" }).returning().all();
        dbContext.db.insert(schema.booksTags).values(
            bobListRows.map(row => ({ listId: row.id, tagId: tag.id }))
        ).run();

        dbContext.db.insert(schema.userMediaMonthlyActivity).values([
            { userId: 2, mediaId: 10, mediaType: MediaType.BOOKS, monthBucket: "2026-02", progressGained: 200, redoGained: 0, hadCompletion: false, lastActivityAt: "2026-02-10T10:00:00.000Z" },
            { userId: 2, mediaId: 20, mediaType: MediaType.BOOKS, monthBucket: "2026-02", progressGained: 150, redoGained: 1, hadCompletion: true, lastActivityAt: "2026-02-20T10:00:00.000Z" },
        ]).run();

        const [col] = dbContext.db.insert(schema.collections).values({ ownerId: 2, title: "Classics", privacy: PrivacyType.PUBLIC }).returning().all();
        dbContext.db.insert(schema.collectionItems).values([
            { collectionId: col.id, mediaType: MediaType.BOOKS, mediaId: 10, orderIndex: 1 },
            { collectionId: col.id, mediaType: MediaType.BOOKS, mediaId: 20, orderIndex: 2 },
        ]).run();

        dbContext.db.insert(schema.userMediaUpdate).values({
            userId: 1,
            mediaId: 20,
            mediaType: MediaType.BOOKS,
            mediaName: "Dune (Edition Française)",
            updateType: UpdateType.STATUS,
            payload: { old_value: null, new_value: Status.COMPLETED },
        }).run();

        dbContext.db.insert(schema.profileCustom).values({
            userId: 2,
            key: "highlightedMedia",
            value: {
                overview: { mode: "curated", title: "Favs", items: [{ mediaType: MediaType.BOOKS, mediaId: 10 }, { mediaType: MediaType.BOOKS, mediaId: 20 }] },
                [MediaType.BOOKS]: { mode: "curated", title: "Books", items: [{ mediaType: MediaType.BOOKS, mediaId: 20 }] },
            },
        }).run();

        const preview = AdminRepository.getBookMergePreview(10, [20]);
        expect(preview).toEqual({
            movedListEntries: 1,
            movedActivities: 0,
            mergedActivities: 1,
            movedCollectionItems: 1,
            overlappingUsers: [{ id: 2, name: "bob" }],
        });

        const result = AdminRepository.mergeBooks(10, [20]);
        expect(result).toEqual({
            targetBookId: 10,
            mergedBookCount: 1,
            movedListEntries: 1,
            duplicateListEntriesRemoved: 1,
            recomputeStatsUserIds: [2],
        });

        // Source book deleted, target remains
        expect(dbContext.db.select().from(schema.books).all().map(b => b.id)).toEqual([10]);

        // Alice moved to target book 10 with her French edition intact
        const aliceEntry = dbContext.db.select().from(schema.booksList).where(eq(schema.booksList.userId, 1)).get()!;
        expect(aliceEntry).toMatchObject({
            mediaId: 10,
            customTitle: "Dune (Edition Française)",
            customPages: 720,
            customPublisher: "Robert Laffont",
            customReleaseDate: "2020-01-01",
            customLanguage: "fr",
        });
        expect(aliceEntry.customCover).toContain("dune-fr.jpg");

        // Bob keeps his target book 10 entry, duplicate removed, cover stays unpinned
        const bobEntries = dbContext.db.select().from(schema.booksList).where(eq(schema.booksList.userId, 2)).all();
        expect(bobEntries).toHaveLength(1);
        expect(bobEntries[0].customTitle).toBe("Dune");
        expect(bobEntries[0].customCover).toBeNull();

        // Monthly activity merged
        const bobActivity = dbContext.db.select().from(schema.userMediaMonthlyActivity).where(eq(schema.userMediaMonthlyActivity.userId, 2)).all();
        expect(bobActivity).toHaveLength(1);
        expect(bobActivity[0]).toMatchObject({ mediaId: 10, progressGained: 350, redoGained: 1, hadCompletion: true });

        // Collection deduplicated
        const colItems = dbContext.db.select().from(schema.collectionItems).where(eq(schema.collectionItems.collectionId, col.id)).all();
        expect(colItems).toHaveLength(1);
        expect(colItems[0]).toMatchObject({ mediaId: 10, orderIndex: 1 });

        // Update history re-pointed
        const updates = dbContext.db.select().from(schema.userMediaUpdate).all();
        expect(updates[0].mediaId).toBe(10);

        // Highlighted media re-pointed & deduplicated
        const highlighted = dbContext.db.select().from(schema.profileCustom).where(eq(schema.profileCustom.userId, 2)).get()!;
        expect(highlighted.value.overview.items).toEqual([{ mediaType: MediaType.BOOKS, mediaId: 10 }]);
        expect(highlighted.value[MediaType.BOOKS].items).toEqual([{ mediaType: MediaType.BOOKS, mediaId: 10 }]);
    });

    it("keeps the richest or most recently updated entry when a user has overlapping books", () => {
        // Alice has a bare Planned row on target #10, and a Completed + rated + reviewed row on duplicate #20
        dbContext.db.insert(schema.booksList).values([
            {
                userId: 1,
                mediaId: 10,
                status: Status.PLANNED,
                actualPage: 0,
                total: 0,
                customTitle: "Dune",
                customPages: 412,
                addedAt: "2025-01-01 00:00:00",
            },
            {
                userId: 1,
                mediaId: 20,
                status: Status.COMPLETED,
                actualPage: 720,
                total: 720,
                rating: 9.5,
                comment: "Masterpiece",
                customTitle: "Dune (Edition Française)",
                customPages: 720,
                customLanguage: "fr",
                addedAt: "2026-01-01 00:00:00",
                lastUpdated: "2026-02-01 00:00:00",
            },
        ]).run();

        AdminRepository.mergeBooks(10, [20]);

        const aliceRows = dbContext.db.select().from(schema.booksList).where(eq(schema.booksList.userId, 1)).all();
        expect(aliceRows).toHaveLength(1);
        expect(aliceRows[0]).toMatchObject({
            mediaId: 10,
            status: Status.COMPLETED,
            rating: 9.5,
            comment: "Masterpiece",
            customTitle: "Dune (Edition Française)",
            customPages: 720,
            customLanguage: "fr",
        });
        expect(aliceRows[0].customCover).toContain("dune-fr.jpg");
    });

    it("does not leak hidden monthly activity into visible buckets when merging mixed-visibility months", () => {
        // Alice: visible on target (#10), hidden on duplicate (#20) in 2026-03
        // Bob: hidden on target (#10), visible on duplicate (#20) in 2026-03; both hidden in 2026-04
        dbContext.db.insert(schema.userMediaMonthlyActivity).values([
            { userId: 1, mediaId: 10, mediaType: MediaType.BOOKS, monthBucket: "2026-03", hidden: false, progressGained: 120, redoGained: 0, hadCompletion: false, lastActivityAt: "2026-03-10T10:00:00.000Z" },
            { userId: 1, mediaId: 20, mediaType: MediaType.BOOKS, monthBucket: "2026-03", hidden: true, progressGained: 400, redoGained: 1, hadCompletion: true, lastActivityAt: "2026-03-20T10:00:00.000Z" },
            { userId: 2, mediaId: 10, mediaType: MediaType.BOOKS, monthBucket: "2026-03", hidden: true, progressGained: 300, redoGained: 1, hadCompletion: true, lastActivityAt: "2026-03-05T10:00:00.000Z" },
            { userId: 2, mediaId: 20, mediaType: MediaType.BOOKS, monthBucket: "2026-03", hidden: false, progressGained: 90, redoGained: 0, hadCompletion: false, lastActivityAt: "2026-03-15T10:00:00.000Z" },
            { userId: 2, mediaId: 10, mediaType: MediaType.BOOKS, monthBucket: "2026-04", hidden: true, progressGained: 50, redoGained: 0, hadCompletion: false, lastActivityAt: "2026-04-01T10:00:00.000Z" },
            { userId: 2, mediaId: 20, mediaType: MediaType.BOOKS, monthBucket: "2026-04", hidden: true, progressGained: 75, redoGained: 1, hadCompletion: true, lastActivityAt: "2026-04-12T10:00:00.000Z" },
        ]).run();

        AdminRepository.mergeBooks(10, [20]);

        const aliceMar = dbContext.db.select().from(schema.userMediaMonthlyActivity).where(eq(schema.userMediaMonthlyActivity.userId, 1)).all();
        expect(aliceMar).toHaveLength(1);
        expect(aliceMar[0]).toMatchObject({
            mediaId: 10,
            hidden: false,
            progressGained: 120,
            redoGained: 0,
            hadCompletion: false,
            lastActivityAt: "2026-03-10T10:00:00.000Z",
        });

        const bobActivities = dbContext.db.select().from(schema.userMediaMonthlyActivity).where(eq(schema.userMediaMonthlyActivity.userId, 2)).all();
        expect(bobActivities).toHaveLength(2);
        expect(bobActivities.find(a => a.monthBucket === "2026-03")).toMatchObject({
            mediaId: 10,
            hidden: false,
            progressGained: 90,
            redoGained: 0,
            hadCompletion: false,
            lastActivityAt: "2026-03-15T10:00:00.000Z",
        });
        expect(bobActivities.find(a => a.monthBucket === "2026-04")).toMatchObject({
            mediaId: 10,
            hidden: true,
            progressGained: 125,
            redoGained: 1,
            hadCompletion: true,
            lastActivityAt: "2026-04-12T10:00:00.000Z",
        });
    });

    it("stages LLM merge suggestions, prevents re-suggesting dismissed groups, tracks reviewed books, and cleans up after merge", async () => {
        dbContext.db.insert(schema.books).values([
            { id: 30, apiId: "work-c", name: "Dune Messiah", pages: 256, imageCover: "default.jpg" },
            { id: 40, apiId: "work-d", name: "Foundation", pages: 244, imageCover: "default.jpg" },
        ]).run();
        dbContext.db.insert(schema.booksAuthors).values([
            { mediaId: 10, name: "Frank Herbert" },
            { mediaId: 20, name: "Frank Herbert" },
            { mediaId: 30, name: "Frank Herbert" },
            { mediaId: 40, name: "Isaac Asimov" },
        ]).run();

        // Authors mode returns multi-book authors with unreviewed books
        const initialBatch = AdminRepository.getBooksForLlmGrouping({ mode: "authors", page: 1, includeReviewed: false });
        expect(initialBatch).toMatchObject({
            mode: "authors",
            totalAuthors: 1,
            progress: {
                totalBooks: 4,
                reviewedBooks: 0,
                unreviewedBooks: 4,
                unreviewedAuthorsWithMultipleBooks: 1,
                pendingSuggestions: 0,
                dismissedSuggestions: 0,
            },
            authors: [{
                name: "Frank Herbert",
                bookCount: 3,
                unreviewedCount: 3,
            }],
        });

        // Propose Dune EN + FR and mark Dune Messiah reviewed too; also include a nonexistent book
        const proposed = AdminRepository.proposeBookMerges({
            proposals: [
                { targetBookId: 10, sourceBookIds: [20], confidence: "high", reason: "French edition of Dune." },
                { targetBookId: 10, sourceBookIds: [999], confidence: "low", reason: "Missing book." },
            ],
            markReviewedBookIds: [30],
        });
        expect(proposed.createdCount).toBe(1);
        expect(proposed.reviewedCount).toBe(3);
        expect(proposed.skipped).toEqual([{ targetBookId: 10, sourceBookIds: [999], reason: "book_not_found" }]);

        // All Frank Herbert books are now reviewed -> excluded from default authors batch, while Asimov remains in unreviewed mode
        const afterReview = AdminRepository.getBooksForLlmGrouping({ mode: "authors", page: 1, includeReviewed: false });
        expect(afterReview).toMatchObject({ totalAuthors: 0, authors: [] });

        const unreviewedMode = AdminRepository.getBooksForLlmGrouping({ mode: "unreviewed", page: 1, includeReviewed: false });
        expect(unreviewedMode).toMatchObject({ total: 1, books: [{ id: 40, name: "Foundation", reviewed: false }] });

        // Adding a new book by Frank Herbert resurfaces him automatically for review with existingSuggestions included
        dbContext.db.insert(schema.books).values({
            id: 50, apiId: "work-e", name: "Dune (Illustrated)", pages: 500, imageCover: "default.jpg",
        }).run();
        dbContext.db.insert(schema.booksAuthors).values({ mediaId: 50, name: "Frank Herbert" }).run();

        const resurfaced = AdminRepository.getBooksForLlmGrouping({ mode: "authors", page: 1, includeReviewed: false });
        expect(resurfaced).toMatchObject({
            totalAuthors: 1,
            authors: [{ name: "Frank Herbert", bookCount: 4, unreviewedCount: 1 }],
            existingSuggestions: [{ status: "pending", targetBookId: 10, bookIds: [10, 20] }],
        });

        // Admin UI suggestions view lists the pending suggestion
        const uiSuggestions = await AdminRepository.getBooksForAdminMerge({ view: "suggestions" });
        expect(uiSuggestions).toMatchObject({
            kind: "suggestions",
            total: 1,
            pendingSuggestionsCount: 1,
            items: [{
                targetBookId: 10,
                confidence: "high",
                reason: "French edition of Dune.",
                books: [{ id: 10 }, { id: 20 }],
            }],
        });

        // Dismissing prevents re-proposing the same group (even with swapped target/source)
        const suggestionId = uiSuggestions.kind === "suggestions" ? uiSuggestions.items[0].id : 0;
        expect(AdminRepository.dismissBookMergeSuggestion(suggestionId)).toBe(true);
        expect(AdminRepository.dismissBookMergeSuggestion(suggestionId)).toBe(false);

        const reProposed = AdminRepository.proposeBookMerges({
            proposals: [{ targetBookId: 20, sourceBookIds: [10], confidence: "medium", reason: "Swapped order." }],
        });
        expect(reProposed.createdCount).toBe(0);
        expect(reProposed.skipped).toEqual([{ targetBookId: 20, sourceBookIds: [10], reason: "already_dismissed" }]);

        // Propose a new group with #50 and then merge #50 into #10 -> suggestion auto-cleans
        AdminRepository.proposeBookMerges({
            proposals: [{ targetBookId: 10, sourceBookIds: [50], confidence: "high", reason: "Illustrated edition." }],
        });
        AdminRepository.mergeBooks(10, [50]);

        const afterMerge = await AdminRepository.getBooksForAdminMerge({ view: "suggestions" });
        expect(afterMerge).toMatchObject({ kind: "suggestions", total: 0, pendingSuggestionsCount: 0, items: [] });

        // Resetting review markers clears book_merge_review
        expect(AdminRepository.markBooksReviewed({ reset: true })).toEqual({ reset: true, clearedCount: 3 });
        expect(AdminRepository.getBookMergeReviewProgress().reviewedBooks).toBe(0);
    });

    it("remaps overlapping suggestions to the surviving target book when merging", async () => {
        dbContext.db.insert(schema.books).values([
            { id: 30, apiId: "work-c", name: "Dune (Collector)", pages: 600, imageCover: "default.jpg" },
            { id: 40, apiId: "work-d", name: "Dune (Pocket)", pages: 500, imageCover: "default.jpg" },
        ]).run();

        // Overlapping suggestions: (10, 20) and (20, 30), plus a third (20, 40) that collides with an existing (10, 40)
        AdminRepository.proposeBookMerges({
            proposals: [
                { targetBookId: 10, sourceBookIds: [20], confidence: "high", reason: "A+B" },
                { targetBookId: 20, sourceBookIds: [30], confidence: "medium", reason: "B+C" },
                { targetBookId: 10, sourceBookIds: [40], confidence: "high", reason: "A+D" },
                { targetBookId: 20, sourceBookIds: [40], confidence: "low", reason: "B+D duplicate after merge" },
            ],
        });

        // Merge 20 (B) into 10 (A)
        AdminRepository.mergeBooks(10, [20]);

        const remaining = await AdminRepository.getBooksForAdminMerge({ view: "suggestions" });
        expect(remaining).toMatchObject({
            kind: "suggestions",
            total: 2,
            pendingSuggestionsCount: 2,
            items: [
                { targetBookId: 10, reason: "A+D", books: [{ id: 10 }, { id: 40 }] },
                { targetBookId: 10, reason: "B+C", books: [{ id: 10 }, { id: 30 }] },
            ],
        });
    });

    it("prioritizes unreviewed books in author batches when an author has more than 60 books", () => {
        const extraBooks = Array.from({ length: 61 }, (_, index) => ({
            id: 100 + index,
            apiId: `prolific-${index}`,
            name: `Prolific Book ${index + 1}`,
            pages: 200,
            imageCover: "default.jpg",
        }));
        dbContext.db.insert(schema.books).values(extraBooks).run();
        dbContext.db.insert(schema.booksAuthors).values(
            extraBooks.map(book => ({ mediaId: book.id, name: "Prolific Author" })),
        ).run();

        // Mark the first 60 books as reviewed, leaving only book #160 unreviewed
        AdminRepository.markBooksReviewed({ bookIds: extraBooks.slice(0, 60).map(book => book.id) });

        const batch = AdminRepository.getBooksForLlmGrouping({ mode: "authors", page: 1, includeReviewed: false });
        expect(batch.mode).toBe("authors");
        if (batch.mode === "authors" && "authors" in batch && batch.authors) {
            expect(batch.authors).toHaveLength(1);
            expect(batch.authors[0]).toMatchObject({
                name: "Prolific Author",
                bookCount: 61,
                unreviewedCount: 1,
                truncated: true,
            });
            expect(batch.authors[0].books).toHaveLength(60);
            expect(batch.authors[0].books.some(book => book.id === 160 && !book.reviewed)).toBe(true);
        }
    });

    it("does not skip unreviewed books when advancing with cursor after marking a batch reviewed", () => {
        dbContext.db.insert(schema.books).values([
            { id: 30, apiId: "work-c", name: "Dune Messiah", pages: 256, imageCover: "default.jpg" },
            { id: 40, apiId: "work-d", name: "Children of Dune", pages: 444, imageCover: "default.jpg" },
        ]).run();

        const first = AdminRepository.getBooksForLlmGrouping({ mode: "unreviewed", limit: 2, page: 1, includeReviewed: false });
        expect(first).toMatchObject({
            mode: "unreviewed",
            total: 4,
            hasMore: true,
            nextCursor: 20,
            books: [{ id: 10 }, { id: 20 }],
        });

        AdminRepository.markBooksReviewed({ bookIds: [10, 20] });

        const withCursor = AdminRepository.getBooksForLlmGrouping({
            mode: "unreviewed", limit: 2, page: 1, cursor: 20, includeReviewed: false,
        });
        expect(withCursor).toMatchObject({
            mode: "unreviewed",
            total: 2,
            hasMore: false,
            nextCursor: null,
            books: [{ id: 30 }, { id: 40 }],
        });

        const withoutCursor = AdminRepository.getBooksForLlmGrouping({
            mode: "unreviewed", limit: 2, page: 1, includeReviewed: false,
        });
        expect(withoutCursor).toMatchObject({
            mode: "unreviewed",
            total: 2,
            hasMore: false,
            nextCursor: null,
            books: [{ id: 30 }, { id: 40 }],
        });
    });
});
