import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {user, userMediaMonthlyActivity, userMediaSettings} from "@/lib/server/database/schema";
import {ActivityKind, MediaType, Status} from "@/lib/utils/enums";
import {MonthlyActivityService} from "./monthly-activity.service";
import {createBooksRepository} from "@/lib/server/domain/media/books/books.repository";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import type {MediaMonthlyActivityRegistry} from "@/lib/server/domain/media/media.registries";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const {MonthlyActivityRepository} = await import(
    "@/lib/server/domain/tracking/monthly-activity.repository"
);


describe("MonthlyActivityRepository", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, {schema, casing: "snake_case"});
        dbContext.db = db;

        migrate(db, {migrationsFolder: "./drizzle"});
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(user).values({
            id: 1,
            emailVerified: true,
            name: "monthly-user",
            email: "monthly@example.com",
            updatedAt: "2026-01-01 00:00:00",
            createdAt: "2026-01-01 00:00:00",
        });
        await db.insert(userMediaSettings).values({
            userId: 1,
            active: true,
            mediaType: MediaType.BOOKS,
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each(["month", "year"] as const)("searches all matching titles before %s activity pagination", async (view) => {
        const books = Array.from({ length: 60 }, (_, index) => ({
            id: index + 1,
            apiId: String(index + 1),
            name: `Match ${String(index + 1).padStart(2, "0")}`,
            pages: 100,
            imageCover: "default.jpg",
        }));
        db.insert(schema.books).values(books).run();
        db.insert(schema.booksList).values(books.map(book => ({
            userId: 1, mediaId: book.id, status: Status.COMPLETED, actualPage: 100, total: 100,
        }))).run();
        db.insert(userMediaMonthlyActivity).values(books.map(book => ({
            userId: 1,
            mediaId: book.id,
            mediaType: MediaType.BOOKS,
            monthBucket: book.id <= 10 ? "2025-12" : "2026-06",
            lastActivityAt: `${book.id <= 10 ? "2025-12" : "2026-06"}-10T12:00:${String(book.id - 1).padStart(2, "0")}.000Z`,
            progressGained: 100,
        }))).run();

        const monthlyActivity = createMediaMonthlyActivity({ definition: booksServerDefinition, repository: createBooksRepository() });
        const service = new MonthlyActivityService(MonthlyActivityRepository, { get: () => monthlyActivity } as MediaMonthlyActivityRegistry);
        const filters = {
            view,
            year: 2026,
            month: 6,
            search: " Match ",
            hiddenOnly: false,
            username: "monthly-user",
            activeTab: MediaType.BOOKS,
            activityKind: ActivityKind.ALL,
        };

        const firstPage = await service.getMonthlyActivity(1, { ...filters, page: 1 });
        const secondPage = await service.getMonthlyActivity(1, { ...filters, page: 2 });

        expect(firstPage).toMatchObject({ total: 50, pages: 2, perPage: 48 });
        expect(firstPage.items).toHaveLength(48);
        expect(secondPage.items).toHaveLength(2);
        expect([...firstPage.items, ...secondPage.items].map(item => item.mediaId))
            .toEqual(Array.from({ length: 50 }, (_, index) => 60 - index));
        expect((await service.getMonthlyActivity(1, { ...filters, search: "Missing", page: 1 })).total).toBe(0);
    });

    it.each(["getPaginatedMonthlyActivities", "getPaginatedYearlyActivities"] as const)(
        "%s searches titles and original names while respecting activity filters",
        async (method) => {
            db.insert(user).values({
                id: 2, name: "other-user", email: "other@example.com", emailVerified: true,
                createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
            }).run();
            db.insert(userMediaSettings).values([
                { userId: 1, mediaType: MediaType.MOVIES, active: true },
                { userId: 2, mediaType: MediaType.BOOKS, active: true },
            ]).run();
            db.insert(schema.books).values([
                { id: 1, apiId: "1", name: "Unrelated book", pages: 100, imageCover: "default.jpg" },
                { id: 2, apiId: "2", name: "Star book", pages: 100, imageCover: "default.jpg" },
                { id: 3, apiId: "3", name: "Star hidden", pages: 100, imageCover: "default.jpg" },
                { id: 4, apiId: "4", name: "Star previous year", pages: 100, imageCover: "default.jpg" },
                { id: 5, apiId: "5", name: "Star other user", pages: 100, imageCover: "default.jpg" },
            ]).run();
            db.insert(schema.movies).values({
                id: 1, apiId: 1, name: "Translated title", originalName: "Star original", duration: 120, imageCover: "default.jpg",
            }).run();
            const base = { userId: 1, mediaType: MediaType.BOOKS, monthBucket: "2026-06", progressGained: 100 };
            db.insert(userMediaMonthlyActivity).values([
                { ...base, mediaId: 1 },
                { ...base, mediaId: 2 },
                { ...base, mediaId: 3, hidden: true },
                { ...base, mediaId: 4, monthBucket: "2025-12" },
                { ...base, mediaId: 5, userId: 2 },
                { ...base, mediaId: 1, mediaType: MediaType.MOVIES, hadCompletion: true },
            ]).run();
            const filters = { startMonth: "2026-01", endMonth: "2026-12", search: "star" };

            const result = await MonthlyActivityRepository[method](1, filters);
            expect(result.total).toBe(2);
            expect(result.items.map(item => `${item.mediaType}:${item.mediaId}`).sort()).toEqual(["books:2", "movies:1"]);

            const booksOnly = await MonthlyActivityRepository[method](1, { ...filters, mediaType: MediaType.BOOKS });
            expect(booksOnly).toMatchObject({ total: 1, items: [{ mediaId: 2 }] });
            const hiddenOnly = await MonthlyActivityRepository[method](1, { ...filters, hiddenOnly: true });
            expect(hiddenOnly).toMatchObject({ total: 1, items: [{ mediaId: 3 }] });
            const completed = await MonthlyActivityRepository[method](1, { ...filters, activityKind: ActivityKind.COMPLETED });
            expect(completed).toMatchObject({ total: 1, items: [{ mediaType: MediaType.MOVIES, mediaId: 1 }] });

            db.update(userMediaSettings).set({ active: false }).where(eq(userMediaSettings.mediaType, MediaType.MOVIES)).run();
            const activeOnly = await MonthlyActivityRepository[method](1, filters);
            expect(activeOnly).toMatchObject({ total: 1, items: [{ mediaType: MediaType.BOOKS, mediaId: 2 }] });
        },
    );

    it("aggregates progress, completion, and multiple redo contributions in one month", async () => {
        const base = {
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            activityDate: "2026-06-10T12:00:00.000Z",
        };

        await MonthlyActivityRepository.addContribution({
            ...base,
            progressGained: 50,
            hadCompletion: true,
            redoGained: 0,
        });
        await MonthlyActivityRepository.addContribution({
            ...base,
            progressGained: 0,
            hadCompletion: false,
            redoGained: 2,
        });
        await MonthlyActivityRepository.addContribution({
            ...base,
            activityDate: "2026-06-05T12:00:00.000Z",
            progressGained: 25,
            hadCompletion: false,
            redoGained: 0,
        });

        const [row] = await db.select().from(userMediaMonthlyActivity);
        expect(row).toMatchObject({
            monthBucket: "2026-06",
            progressGained: 75,
            hadCompletion: true,
            redoGained: 2,
            lastActivityAt: "2026-06-10T12:00:00.000Z",
        });
    });

    it.each([
        ActivityKind.PROGRESSED,
        ActivityKind.COMPLETED,
        ActivityKind.REDO,
    ])("allows one summary to match the %s filter", async (activityKind) => {
        await db.insert(userMediaMonthlyActivity).values({
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            monthBucket: "2026-06",
            progressGained: 50,
            hadCompletion: true,
            redoGained: 2,
        });

        const result = await MonthlyActivityRepository.getPaginatedMonthlyActivities(1, {
            page: 1,
            perPage: 10,
            startMonth: "2026-06",
            endMonth: "2026-06",
            activityKind,
        });

        expect(result.items).toHaveLength(1);
    });

    it("creates completion-only and redo-only summaries", async () => {
        await MonthlyActivityRepository.addContribution({
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            activityDate: "2026-06-10T12:00:00.000Z",
            progressGained: 0,
            hadCompletion: true,
            redoGained: 0,
        });
        await MonthlyActivityRepository.addContribution({
            userId: 1,
            mediaId: 11,
            mediaType: MediaType.BOOKS,
            activityDate: "2026-06-11T12:00:00.000Z",
            progressGained: 0,
            hadCompletion: false,
            redoGained: 1,
        });

        const rows = await db.select().from(userMediaMonthlyActivity);
        expect(rows).toHaveLength(2);
    });

    it("returns every monthly summary inside a full-year range", async () => {
        await db.insert(userMediaMonthlyActivity).values([
            {
                userId: 1,
                mediaId: 10,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-01",
                lastActivityAt: "2026-01-10T12:00:00.000Z",
                progressGained: 40,
            },
            {
                userId: 1,
                mediaId: 10,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-08",
                lastActivityAt: "2026-08-10T12:00:00.000Z",
                progressGained: 60,
            },
            {
                userId: 1,
                mediaId: 11,
                mediaType: MediaType.BOOKS,
                monthBucket: "2025-12",
                lastActivityAt: "2025-12-10T12:00:00.000Z",
                progressGained: 20,
            },
        ]);

        const result = await MonthlyActivityRepository.getPaginatedMonthlyActivities(1, {
            page: 1,
            perPage: 10,
            startMonth: "2026-01",
            endMonth: "2026-12",
        });

        expect(result.items).toHaveLength(2);
        expect(result.items.map((row) => row.monthBucket)).toEqual(["2026-08", "2026-01"]);
    });

    it("consolidates yearly summaries before pagination and keeps their occurrences", async () => {
        await db.insert(userMediaMonthlyActivity).values([
            {
                userId: 1,
                mediaId: 10,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-01",
                lastActivityAt: "2026-01-10T12:00:00.000Z",
                progressGained: 40,
                redoGained: 1,
            },
            {
                userId: 1,
                mediaId: 10,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-08",
                lastActivityAt: "2026-08-10T12:00:00.000Z",
                progressGained: 60,
                hadCompletion: true,
                redoGained: 2,
            },
            {
                userId: 1,
                mediaId: 11,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-06",
                lastActivityAt: "2026-06-10T12:00:00.000Z",
                progressGained: 20,
            },
        ]);

        const firstPage = await MonthlyActivityRepository.getPaginatedYearlyActivities(1, {
            page: 1,
            perPage: 1,
            startMonth: "2026-01",
            endMonth: "2026-12",
        });

        expect(firstPage).toMatchObject({ total: 2, page: 1, pages: 2, perPage: 1 });
        expect(firstPage.items).toHaveLength(1);
        expect(firstPage.items[0]).toMatchObject({
            mediaId: 10,
            progressGained: 100,
            redoGained: 3,
            hadCompletion: true,
            lastActivityAt: "2026-08-10T12:00:00.000Z",
        });
        expect(firstPage.items[0].occurrences.map((row) => row.monthBucket)).toEqual(["2026-08", "2026-01"]);

        const secondPage = await MonthlyActivityRepository.getPaginatedYearlyActivities(1, {
            page: 2,
            perPage: 1,
            startMonth: "2026-01",
            endMonth: "2026-12",
        });

        expect(secondPage.items).toHaveLength(1);
        expect(secondPage.items[0]).toMatchObject({ mediaId: 11, progressGained: 20 });
    });

    it("merges every contribution when moving activity to another month", async () => {
        const [june] = await db.insert(userMediaMonthlyActivity).values({
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            monthBucket: "2026-06",
            progressGained: 40,
            hadCompletion: true,
            redoGained: 1,
        }).returning();
        await db.insert(userMediaMonthlyActivity).values({
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            monthBucket: "2026-07",
            progressGained: 10,
            hadCompletion: false,
            redoGained: 2,
        });

        await MonthlyActivityRepository.updateMonthlyActivity(1, june.id, {
            lastActivityAt: "2026-07-20T12:00:00.000Z",
        });

        const rows = await db.select().from(userMediaMonthlyActivity);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            monthBucket: "2026-07",
            progressGained: 50,
            hadCompletion: true,
            redoGained: 3,
        });
    });

    it("excludes inactive media lists from recap activity and media types", async () => {
        await db.insert(userMediaMonthlyActivity).values([
            {
                userId: 1,
                mediaId: 10,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-02",
                progressGained: 120,
            },
            {
                userId: 1,
                mediaId: 11,
                mediaType: MediaType.BOOKS,
                monthBucket: "2026-03",
                progressGained: 80,
                hidden: true,
            },
            {
                userId: 1,
                mediaId: 12,
                mediaType: MediaType.BOOKS,
                monthBucket: "2025-12",
                progressGained: 0,
                hadCompletion: true,
            },
            {
                userId: 1,
                mediaId: 13,
                mediaType: MediaType.BOOKS,
                monthBucket: "2027-01",
                progressGained: 50,
            },
        ]);

        const activeActivities = await MonthlyActivityRepository.getYearRecapActivities(1, 2026);
        const activeMediaTypes = await MonthlyActivityRepository.getYearRecapMediaTypes(1, 2026);

        expect(activeActivities).toHaveLength(1);
        expect(activeActivities[0]).toMatchObject({ mediaId: 10, progressGained: 120 });
        expect(activeMediaTypes).toEqual([MediaType.BOOKS]);

        await db.update(userMediaSettings).set({ active: false });

        const activities = await MonthlyActivityRepository.getYearRecapActivities(1, 2026);
        const mediaTypes = await MonthlyActivityRepository.getYearRecapMediaTypes(1, 2026);

        expect(activities).toHaveLength(0);
        expect(mediaTypes).toEqual([]);
    });
});
