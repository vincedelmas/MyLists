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


const {UserMonthlyActivityRepository} = await import(
    "@/lib/server/domain/user/user-monthly-activity.repository"
);


describe("UserMonthlyActivityRepository", () => {
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

        await UserMonthlyActivityRepository.addContribution({
            ...base,
            progressGained: 50,
            hadCompletion: true,
            redoGained: 0,
        });
        await UserMonthlyActivityRepository.addContribution({
            ...base,
            progressGained: 0,
            hadCompletion: false,
            redoGained: 2,
        });
        await UserMonthlyActivityRepository.addContribution({
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

        const result = await UserMonthlyActivityRepository.getPaginatedMonthlyActivities(1, {
            page: 1,
            perPage: 10,
            timeBucket: "2026-06",
            activityKind,
        });

        expect(result.items).toHaveLength(1);
    });

    it("creates completion-only and redo-only summaries", async () => {
        await UserMonthlyActivityRepository.addContribution({
            userId: 1,
            mediaId: 10,
            mediaType: MediaType.BOOKS,
            activityDate: "2026-06-10T12:00:00.000Z",
            progressGained: 0,
            hadCompletion: true,
            redoGained: 0,
        });
        await UserMonthlyActivityRepository.addContribution({
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

        await UserMonthlyActivityRepository.updateMonthlyActivity(1, june.id, {
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
});
