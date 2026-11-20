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
        const [tag] = dbContext.db.insert(schema.mediaTags).values({ userId: 2, mediaType: MediaType.BOOKS, name: "Sci-Fi" }).returning().all();
        dbContext.db.insert(schema.booksTags).values([
            { userId: 2, mediaId: 10, tagId: tag.id },
            { userId: 2, mediaId: 20, tagId: tag.id },
        ]).run();

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
});
