import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { StatsSummaryReadService } = await import("./stats-summary-read.service");
const { StatsSummaryRepository } = await import("./stats-summary.repository");


describe("normalized statistics summaries", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([user(1, "one"), user(2, "two")]);
        await db.insert(schema.profileMediaChannel).values([
            { userId: 1, kind: MediaType.SERIES, enabled: true },
            { userId: 1, kind: MediaType.MOVIES, enabled: false },
            { userId: 2, kind: MediaType.SERIES, enabled: true },
        ]);
        await db.insert(schema.libraryStats).values([
            {
                userId: 1,
                kind: MediaType.SERIES,
                timeSpentMinutes: 120,
                totalEntries: 3,
                entriesRated: 2,
                ratingSum: 17,
                entriesCommented: 1,
                entriesFavorited: 1,
                totalSpecific: 10,
                averageRating: 8.5,
                statusCounts: { [Status.WATCHING]: 1, [Status.COMPLETED]: 1, [Status.PLAN_TO_WATCH]: 1 },
            },
            {
                userId: 1,
                kind: MediaType.MOVIES,
                timeSpentMinutes: 9000,
                totalEntries: 50,
                entriesRated: 50,
                ratingSum: 500,
                statusCounts: { [Status.COMPLETED]: 50 },
            },
            {
                userId: 2,
                kind: MediaType.SERIES,
                timeSpentMinutes: 60,
                totalEntries: 1,
                entriesRated: 1,
                ratingSum: 7,
                averageRating: 7,
                statusCounts: { [Status.COMPLETED]: 1 },
            },
        ]);
        await db.insert(schema.libraryTag).values([
            { userId: 1, kind: MediaType.SERIES, name: "favorite" },
            { userId: 1, kind: MediaType.SERIES, name: "rewatch" },
            { userId: 1, kind: MediaType.MOVIES, name: "favorite" },
            { userId: 2, kind: MediaType.SERIES, name: "favorite" },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("summarizes only enabled channels for one profile and the platform", async () => {
        const reader = new StatsSummaryReadService();
        await expect(reader.getSummary(1)).resolves.toEqual({
            avgRated: 8.5,
            totalRedo: 0,
            totalRated: 2,
            avgComments: 1,
            percentRated: 100,
            avgFavorites: 1,
            totalEntries: 3,
            totalComments: 1,
            totalFavorites: 1,
            totalEntriesNoPlan: 2,
            mediaTimeDistribution: [{ name: MediaType.SERIES, value: 2 }],
            totalHours: 2,
            totalDays: 2 / 24,
            mediaTypes: [MediaType.SERIES],
        });
        await expect(reader.getSummary()).resolves.toMatchObject({
            avgRated: 8,
            totalRated: 3,
            avgComments: 0.5,
            avgFavorites: 0.5,
            totalEntries: 4,
            totalEntriesNoPlan: 3,
            totalHours: 3,
            totalUsers: 2,
            mediaTypes: [MediaType.SERIES],
        });
    });

    it("preserves the existing per-media percentages and status contract", async () => {
        await expect(new StatsSummaryReadService().getPerMediaSummary(1)).resolves.toEqual([{
            statusList: [
                { status: Status.WATCHING, count: 1, percent: (1 / 3) * 100 },
                { status: Status.COMPLETED, count: 1, percent: (1 / 3) * 100 },
                { status: Status.PLAN_TO_WATCH, count: 1, percent: (1 / 3) * 100 },
            ],
            totalNoPlan: 2,
            mediaType: MediaType.SERIES,
            avgRated: 8.5,
            timeSpent: 2,
            noData: false,
            totalEntries: 3,
            entriesRated: 2,
            totalSpecific: 10,
            timeSpentDays: 120 / 1440,
            entriesFavorites: 1,
            percentRated: 100,
        }]);
    });

    it("counts distinct tag names per active family instead of globally", async () => {
        await expect(StatsSummaryRepository.countTags([MediaType.SERIES], 1)).resolves.toBe(2);
        await expect(StatsSummaryRepository.countTags([MediaType.SERIES, MediaType.MOVIES])).resolves.toBe(3);
    });
});


const user = (id: number, name: string) => ({
    id,
    name,
    privacy: PrivacyType.PUBLIC,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
