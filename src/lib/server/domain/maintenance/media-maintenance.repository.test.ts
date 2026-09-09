import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import {MediaType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {collectionItems, collections, dailyMediadle, movies, moviesActors, moviesList, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/db", () => ({
    get db() {
        return dbContext.db;
    },
}));


const { MediaMaintenanceRepository } = await import("@/lib/server/domain/maintenance/media-maintenance.repository");
const { withTransaction } = await import("@/lib/server/database/async-storage");


describe("MediaMaintenanceRepository", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(user).values({
            id: 42,
            emailVerified: true,
            name: "maintenance-user",
            email: "maintenance@example.com",
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
        });
        await db.insert(movies).values([
            { id: 100, apiId: 1000, duration: 120, name: "Movie 1", imageCover: "1.jpg" },
            { id: 101, apiId: 1001, duration: 90, name: "Movie 2", imageCover: "2.jpg" },
        ]);
    });

    afterEach(() => {
        vi.useRealTimers();
        sqlite.close();
        dbContext.db = undefined;
    });

    it("finds media absent from both user lists and collections", async () => {
        await db.insert(movies).values({
            id: 102,
            apiId: 1002,
            duration: 105,
            imageCover: "3.jpg",
            name: "Orphaned movie",
        });
        await db.insert(moviesList).values({
            id: 1,
            userId: 42,
            mediaId: 100,
            status: Status.COMPLETED,
        });
        await db.insert(collections).values({
            id: 1,
            ownerId: 42,
            title: "Movie collection",
            mediaType: MediaType.MOVIES,
        });
        await db.insert(collectionItems).values({
            mediaId: 101,
            orderIndex: 0,
            collectionId: 1,
            mediaType: MediaType.MOVIES,
        });

        await db.insert(moviesActors).values({ mediaId: 102, name: "Orphan actor" });
        const orphanIds = MediaMaintenanceRepository.getOrphanedMediaIds(MediaType.MOVIES);
        expect(orphanIds).toEqual([102]);

        withTransaction(() => MediaMaintenanceRepository.removeMediaByIds(MediaType.MOVIES, orphanIds));

        expect(db.select({ id: movies.id }).from(movies).all()).toEqual([{ id: 100 }, { id: 101 }]);
        expect(db.select().from(moviesActors).all()).toEqual([]);
    });

    it.each([
        { date: "2026-09-09", mediaType: MediaType.MOVIES, protected: true },
        { date: "2026-09-10", mediaType: MediaType.MOVIES, protected: true },
        { date: "2026-09-08", mediaType: MediaType.MOVIES, protected: false },
        { date: "2026-09-09", mediaType: MediaType.SERIES, protected: false },
    ])("handles $mediaType daily game on $date during orphan cleanup", ({ date, mediaType, protected: isProtected }) => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-09-09T23:30:00Z"));

        db.insert(dailyMediadle).values({ mediaId: 100, mediaType, date }).run();

        withTransaction(() => {
            const orphanIds = MediaMaintenanceRepository.getOrphanedMediaIds(MediaType.MOVIES);
            expect(orphanIds).toEqual(isProtected ? [101] : [100, 101]);
            MediaMaintenanceRepository.removeMediaByIds(MediaType.MOVIES, orphanIds);
        });

        expect(db.select({ id: movies.id }).from(movies).all()).toEqual(isProtected ? [{ id: 100 }] : []);
        expect(db.select().from(dailyMediadle).all()).toHaveLength(1);
    });

    it("returns filenames for stored covers and only nonempty custom covers", async () => {
        await db.insert(moviesList).values([
            { userId: 42, mediaId: 100, status: Status.COMPLETED, customCover: "custom.jpg" },
            { userId: 42, mediaId: 101, status: Status.COMPLETED },
        ]);

        await expect(MediaMaintenanceRepository.getCoverFilenames(MediaType.MOVIES)).resolves.toEqual(["1.jpg", "2.jpg"]);
        await expect(MediaMaintenanceRepository.getCustomCoverFilenames(MediaType.MOVIES)).resolves.toEqual(["custom.jpg"]);
        await expect(MediaMaintenanceRepository.getCoverFilenames(MediaType.BOOKS)).resolves.toEqual([]);
    });

    it("rolls dependent deletions back with the caller transaction when media deletion fails", () => {
        db.insert(moviesActors).values({ mediaId: 100, name: "Actor" }).run();
        sqlite.exec(`CREATE TRIGGER fail_media_delete BEFORE DELETE ON movies
            WHEN OLD.id = 100 BEGIN SELECT RAISE(ABORT, 'deletion failed'); END`);

        expect(() => withTransaction(() => {
            MediaMaintenanceRepository.removeMediaByIds(MediaType.MOVIES, [100]);
        })).toThrow();

        expect(db.select().from(movies).where(eq(movies.id, 100)).get()).toBeDefined();
        expect(db.select().from(moviesActors).all()).toHaveLength(1);
    });
});
