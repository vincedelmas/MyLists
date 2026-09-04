import Database from "bun:sqlite";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {user, userMediaMonthlyActivity, userMediaSettings} from "@/lib/server/database/schema";
import {ActivityKind, MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const {monthlyActivityRepository} = await import(
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

    it("aggregates progress, completion, and multiple redo contributions in one month", async () => {
        const base = {
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            activityDate: "2026-06-10T12:00:00.000Z",
        };

        await monthlyActivityRepository.addContribution({
            ...base,
            progressGained: 50,
            hadCompletion: true,
            redoGained: 0,
        });
        await monthlyActivityRepository.addContribution({
            ...base,
            progressGained: 0,
            hadCompletion: false,
            redoGained: 2,
        });
        await monthlyActivityRepository.addContribution({
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

        const result = await monthlyActivityRepository.getPaginatedMonthlyActivities(1, {
            page: 1,
            perPage: 10,
            startMonth: "2026-06",
            endMonth: "2026-06",
            activityKind,
        });

        expect(result.items).toHaveLength(1);
    });

    it("creates completion-only and redo-only summaries", async () => {
        await monthlyActivityRepository.addContribution({
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            activityDate: "2026-06-10T12:00:00.000Z",
            progressGained: 0,
            hadCompletion: true,
            redoGained: 0,
        });
        await monthlyActivityRepository.addContribution({
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

        const result = await monthlyActivityRepository.getPaginatedMonthlyActivities(1, {
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

        const firstPage = await monthlyActivityRepository.getPaginatedYearlyActivities(1, {
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

        const secondPage = await monthlyActivityRepository.getPaginatedYearlyActivities(1, {
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

        await monthlyActivityRepository.updateMonthlyActivity(1, june.id, {
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

        const activeActivities = await monthlyActivityRepository.getYearRecapActivities(1, 2026);
        const activeMediaTypes = await monthlyActivityRepository.getYearRecapMediaTypes(1, 2026);

        expect(activeActivities).toHaveLength(1);
        expect(activeActivities[0]).toMatchObject({ mediaId: 10, progressGained: 120 });
        expect(activeMediaTypes).toEqual([MediaType.BOOKS]);

        await db.update(userMediaSettings).set({ active: false });

        const activities = await monthlyActivityRepository.getYearRecapActivities(1, 2026);
        const mediaTypes = await monthlyActivityRepository.getYearRecapMediaTypes(1, 2026);

        expect(activities).toHaveLength(0);
        expect(mediaTypes).toEqual([]);
    });
});
