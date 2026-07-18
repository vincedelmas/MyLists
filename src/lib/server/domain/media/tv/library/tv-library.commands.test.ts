import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { TvLibraryRepository } = await import("./tv-library.repository");
const { TvLibraryCommands } = await import("./tv-library.commands");
const { TvLibraryReadRepository } = await import("./tv-library-read.repository");
const { TvStatsRepository } = await import("./tv-stats.repository");


describe("TV library commands", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    let service: InstanceType<typeof TvLibraryCommands>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        service = new TvLibraryCommands(new TvLibraryRepository());
        await seedTv(db);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps progress, rewatches, stats, activity and history in one TV transition model", async () => {
        const added = await service.add({
            userId: 42,
            catalogItemId: 1000,
            status: Status.WATCHING,
        });
        expect(added.progress).toMatchObject({ currentSeason: 1, currentEpisode: 1, watchedEpisodes: 1 });
        await expectStats(db, { totalEntries: 1, totalSpecific: 1, timeSpentMinutes: 45, totalRedo: 0 });

        const progressed = await service.moveProgress({
            userId: 42,
            catalogItemId: 1000,
            seasonNumber: 2,
            episodeNumber: 3,
        });
        expect(progressed.progress.watchedEpisodes).toBe(15);
        await expectStats(db, { totalEntries: 1, totalSpecific: 15, timeSpentMinutes: 675, totalRedo: 0 });

        const rewatched = await service.replaceRewatches({
            userId: 42,
            catalogItemId: 1000,
            rewatches: [{ seasonNumber: 1, count: 1 }],
        });
        expect(rewatched.progress.rewatches).toEqual([{ seasonNumber: 1, count: 1 }]);
        await expectStats(db, { totalEntries: 1, totalSpecific: 27, timeSpentMinutes: 1_215, totalRedo: 1 });

        const completed = await service.changeStatus({
            userId: 42,
            catalogItemId: 1000,
            status: Status.COMPLETED,
        });
        expect(completed.progress).toMatchObject({ currentSeason: 2, currentEpisode: 8, watchedEpisodes: 20 });
        await expectStats(db, { totalEntries: 1, totalSpecific: 32, timeSpentMinutes: 1_440, totalRedo: 1 });

        const stats = await db.select().from(schema.libraryStats).get();
        expect(stats).toBeDefined();
        expect(stats!.statusCounts).toMatchObject({ [Status.WATCHING]: 0, [Status.COMPLETED]: 1 });

        const activities = await db.select().from(schema.libraryActivity);
        expect(activities).toEqual([
            expect.objectContaining({ unitsGained: 32, completed: true, redo: true }),
        ]);
        const changes = await db.select().from(schema.libraryChange).orderBy(schema.libraryChange.id);
        expect(changes.map(({ updateType, payload }) => ({ updateType, payload }))).toEqual([
            { updateType: UpdateType.STATUS, payload: { oldValue: null, newValue: Status.WATCHING } },
            { updateType: UpdateType.TV, payload: { oldValue: [1, 1], newValue: [2, 3] } },
            { updateType: UpdateType.REDO, payload: { oldValue: 0, newValue: 1 } },
            { updateType: UpdateType.STATUS, payload: { oldValue: Status.WATCHING, newValue: Status.COMPLETED } },
        ]);

        await service.synchronizeProfileChannel({ userId: 42, kind: MediaType.SERIES, enabled: true, views: 0 });
        const statsReader = new TvStatsRepository(MediaType.SERIES);
        const statsAccess = { type: "library", access: { ownerId: 42, actorId: 42, reason: "owner", mediaTypeEnabled: true } } as const;
        expect(await statsReader.getAggregatedMediaStats(statsAccess)).toMatchObject({
            totalEntries: 1,
            totalRedo: 1,
            totalSpecific: 32,
            timeSpentHours: 24,
            timeSpentDays: 1,
            totalRated: 0,
            avgRated: null,
            statusesCounts: expect.arrayContaining([{ name: Status.COMPLETED, value: 1 }]),
        });
        expect(await statsReader.getAdvancedMediaStats(statsAccess, null)).toMatchObject({
            totalTags: 0,
            totalSeasons: 2,
            avgDuration: 1_440,
            releaseDates: [],
            durationDistrib: [{ name: "10", value: 1 }],
            genresStats: [],
            actorsStats: [],
            networksStats: [],
            countriesStats: [],
            ratings: expect.arrayContaining([{ name: "0.0", value: 0 }, { name: "10.0", value: 0 }]),
        });

        const history = await new TvLibraryReadRepository(MediaType.SERIES).getUserMediaHistory(42, 1000);
        expect(history.map(({ id, mediaId, mediaName, payload }) => ({ id, mediaId, mediaName, payload }))).toEqual([
            { id: 4, mediaId: 1000, mediaName: "A difficult show", payload: { oldValue: Status.WATCHING, newValue: Status.COMPLETED } },
            { id: 3, mediaId: 1000, mediaName: "A difficult show", payload: { oldValue: 0, newValue: 1 } },
            { id: 2, mediaId: 1000, mediaName: "A difficult show", payload: { oldValue: [1, 1], newValue: [2, 3] } },
            { id: 1, mediaId: 1000, mediaName: "A difficult show", payload: { oldValue: null, newValue: Status.WATCHING } },
        ]);
    });

    it("preserves catalog activity history on removal while reversing library projections", async () => {
        await service.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        await service.remove({ userId: 42, catalogItemId: 1000 });

        expect(await db.select().from(schema.libraryEntry)).toHaveLength(0);
        expect(await db.select().from(schema.tvProgress)).toHaveLength(0);
        expect(await db.select().from(schema.libraryChange)).toHaveLength(0);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({
                userId: 42,
                catalogItemId: 1000,
                libraryEntryId: null,
            }),
        ]);
        await expectStats(db, { totalEntries: 0, totalSpecific: 0, timeSpentMinutes: 0, totalRedo: 0 });
    });

    it("rejects duplicate entries and invalid cross-family catalog IDs", async () => {
        await service.add({ userId: 42, catalogItemId: 1000 });
        await expect(service.add({ userId: 42, catalogItemId: 1000 })).rejects.toThrow("already in your list");
        await expect(service.add({ userId: 42, catalogItemId: 2000 })).rejects.toThrow("Media not found");
    });

    it("projects common fields and preserves per-list tag semantics", async () => {
        const entry = await service.add({ userId: 42, catalogItemId: 1000 });
        await service.updateRating({ userId: 42, catalogItemId: 1000, rating: 8.5 });
        await service.updateComment({ userId: 42, catalogItemId: 1000, comment: "Worth continuing" });
        await service.updateFavorite({ userId: 42, catalogItemId: 1000, favorite: true });

        const [stats] = await db.select().from(schema.libraryStats);
        expect(stats).toMatchObject({
            entriesRated: 1,
            ratingSum: 8.5,
            averageRating: 8.5,
            entriesCommented: 1,
            entriesFavorited: 1,
        });

        const repository = new TvLibraryRepository();
        await repository.editTag({
            userId: 42,
            kind: MediaType.SERIES,
            action: TagAction.ADD,
            name: "comfort",
            libraryEntryId: entry.id,
        });
        await repository.editTag({
            userId: 42,
            kind: MediaType.SERIES,
            action: TagAction.RENAME,
            oldName: "comfort",
            name: "favorites",
        });
        expect(await db.select().from(schema.libraryTag)).toEqual([
            expect.objectContaining({ name: "favorites", kind: MediaType.SERIES }),
        ]);
        expect(await db.select().from(schema.libraryEntryTag)).toHaveLength(1);

        await repository.editTag({
            userId: 42,
            kind: MediaType.SERIES,
            action: TagAction.DELETE_ONE,
            name: "favorites",
            libraryEntryId: entry.id,
        });
        expect(await db.select().from(schema.libraryTag)).toHaveLength(0);
        expect(await db.select().from(schema.libraryEntryTag)).toHaveLength(0);
    });
});


const expectStats = async (
    db: BunSQLiteDatabase<typeof schema>,
    expected: { totalEntries: number; totalSpecific: number; timeSpentMinutes: number; totalRedo: number },
) => {
    const [stats] = await db
        .select()
        .from(schema.libraryStats)
        .where(eq(schema.libraryStats.kind, MediaType.SERIES));
    expect(stats).toMatchObject(expected);
};


const seedTv = async (db: BunSQLiteDatabase<typeof schema>) => {
    await db.insert(schema.user).values({
        id: 42,
        name: "tv-user",
        email: "tv-user@example.com",
        emailVerified: true,
        createdAt: "2026-01-01 00:00:00",
        updatedAt: "2026-01-01 00:00:00",
    });
    await db.insert(schema.catalogItem).values([
        {
            id: 1000,
            kind: MediaType.SERIES,
            primaryProvider: "tmdb",
            primaryExternalId: "500",
            name: "A difficult show",
            imageCover: "show.jpg",
        },
        {
            id: 2000,
            kind: MediaType.MOVIES,
            primaryProvider: "tmdb",
            primaryExternalId: "600",
            name: "Not TV",
            imageCover: "movie.jpg",
        },
    ]);
    await db.insert(schema.tvDetails).values({
        catalogItemId: 1000,
        episodeDurationMinutes: 45,
        totalSeasons: 2,
        totalEpisodes: 20,
    });
    await db.insert(schema.tvSeason).values([
        { catalogItemId: 1000, seasonNumber: 1, episodeCount: 12 },
        { catalogItemId: 1000, seasonNumber: 2, episodeCount: 8 },
    ]);
};
