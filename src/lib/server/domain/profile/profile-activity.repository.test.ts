import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {MEDIA_TYPES, MediaType, PrivacyType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { ActivityRepository } = await import("../activity/activity.repository");
const access = { ownerId: 1, actorId: 2, reason: "public" as const };


describe("cross-family normalized profile activity", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 1,
            name: "owner",
            privacy: PrivacyType.PUBLIC,
            email: "owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.catalogItem).values([
            catalog(10, MediaType.SERIES),
            catalog(11, MediaType.MOVIES),
            catalog(12, MediaType.SERIES),
        ]);
        await db.insert(schema.profileMediaChannel).values([
            { userId: 1, kind: MediaType.SERIES, enabled: true },
            { userId: 1, kind: MediaType.MOVIES, enabled: false },
        ]);
        await db.insert(schema.libraryEntry).values([
            { id: 20, userId: 1, catalogItemId: 10, status: Status.WATCHING },
            { id: 21, userId: 1, catalogItemId: 11, status: Status.WATCHING },
        ]);
        await db.insert(schema.libraryActivity).values([
            activity(1, MediaType.SERIES, 10, 3, "2026-03-03 00:00:00"),
            activity(2, MediaType.MOVIES, 11, 2, "2026-03-02 00:00:00"),
            activity(3, MediaType.SERIES, 12, 1, "2026-03-01 00:00:00"),
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("combines enabled families and preserves detached durable activity identities", async () => {
        await expect(ActivityRepository.getPaginatedActivities(access, {
            timeBucket: "2026-03",
            page: 1,
            perPage: 48,
        })).resolves.toMatchObject({
            total: 2,
            items: [
                { id: 1, mediaId: 10, mediaType: MediaType.SERIES, specificGained: 3 },
                { id: 3, mediaId: 12, mediaType: MediaType.SERIES, specificGained: 1 },
            ],
        });
        await expect(ActivityRepository.getActivityMediaTypes(access, "2026-03"))
            .resolves.toEqual([MediaType.SERIES]);
        await expect(ActivityRepository.getStatsActivities(
            access,
            [...MEDIA_TYPES],
            "2026-03",
        )).resolves.toEqual([
            { mediaId: 12, mediaType: MediaType.SERIES, specificGained: 1 },
            { mediaId: 10, mediaType: MediaType.SERIES, specificGained: 3 },
        ]);
    });

    it("uses the same enabled-channel boundary for platform chart inputs", async () => {
        await expect(ActivityRepository.getActivityStatsByMonth({
            startMonth: "2026-01",
        })).resolves.toEqual([
            { mediaId: 10, mediaType: MediaType.SERIES, monthBucket: "2026-03", specificGained: 3 },
            { mediaId: 12, mediaType: MediaType.SERIES, monthBucket: "2026-03", specificGained: 1 },
        ]);
    });

    it("adds, edits, moves, hides, and deletes activity by canonical identity", async () => {
        const created = await ActivityRepository.addActivity(1, {
            mediaType: MediaType.SERIES,
            mediaId: 10,
            specificGained: 4,
            lastUpdate: "2026-04-10T12:00:00.000Z",
        });
        expect(created).toMatchObject({ id: 4, monthBucket: "2026-04", unitsGained: 4 });

        const moved = await ActivityRepository.updateActivity(1, created.id, {
            specificGained: 5,
            hidden: false,
            lastUpdate: "2026-05-10T12:00:00.000Z",
        });
        expect(moved).toMatchObject({ monthBucket: "2026-05", unitsGained: 5 });
        expect(await db.select().from(schema.libraryActivity)
            .where(eq(schema.libraryActivity.id, created.id))).toEqual([]);

        await expect(ActivityRepository.bulkHideActivity(1, {
            startDate: "2026-05-01T00:00:00.000Z",
            endDate: "2026-05-31T23:59:59.999Z",
        })).resolves.toEqual({ count: 1 });
        await ActivityRepository.deleteActivity(1, moved!.id);
        expect(await db.select().from(schema.libraryActivity)
            .where(eq(schema.libraryActivity.id, moved!.id))).toEqual([]);
    });
});


const catalog = (id: number, kind: MediaType) => ({
    id,
    kind,
    primaryProvider: "tmdb" as const,
    primaryExternalId: String(id),
    name: `${kind}-${id}`,
    imageCover: `${id}.jpg`,
});


const activity = (
    id: number,
    kind: MediaType,
    catalogItemId: number,
    unitsGained: number,
    lastUpdatedAt: string,
) => ({
    id,
    userId: 1,
    kind,
    catalogItemId,
    unitsGained,
    completed: false,
    redo: false,
    hidden: false,
    monthBucket: "2026-03",
    lastUpdatedAt,
});
