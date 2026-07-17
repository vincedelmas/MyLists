import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ActivityRepository} from "@/lib/server/domain/activity/activity.repository";
import {ActivityKind, MediaType, Status, TagAction, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { GameLibraryRepository } = await import("./game-library.repository");
const { GameLibraryCommands } = await import("./game-library.commands");


describe("game library commands", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 42,
            name: "game-owner",
            email: "game-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.catalogItem).values({
            id: 1000,
            kind: MediaType.GAMES,
            primaryProvider: "igdb",
            primaryExternalId: "777",
            name: "Game",
            imageCover: "game.jpg",
        });
        await db.insert(schema.gameDetails).values({ catalogItemId: 1000 });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps status, playtime, selected platform, stats, activity and history coherent", async () => {
        const library = new GameLibraryCommands(new GameLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.PLAYING });
        await library.replacePlaytime({ userId: 42, catalogItemId: 1000, playtime: 600 });
        await library.replacePlatform({ userId: 42, catalogItemId: 1000, platform: "PC" });
        const completed = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });

        expect(completed.progress).toEqual({ status: Status.COMPLETED, playtimeMinutes: 600, platform: "PC" });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({
                kind: MediaType.GAMES,
                timeSpentMinutes: 600,
                totalEntries: 1,
                totalRedo: 0,
                totalSpecific: 0,
            }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 600, completed: true, redo: false }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toEqual([
            expect.objectContaining({ updateType: UpdateType.STATUS, payload: { oldValue: null, newValue: Status.PLAYING } }),
            expect.objectContaining({ updateType: UpdateType.PLAYTIME, payload: { oldValue: 0, newValue: 600 } }),
            expect.objectContaining({ updateType: UpdateType.STATUS, payload: { oldValue: Status.PLAYING, newValue: Status.COMPLETED } }),
        ]);

        const planned = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.PLAN_TO_PLAY });
        expect(planned.progress).toEqual({ status: Status.PLAN_TO_PLAY, playtimeMinutes: 0, platform: "PC" });
        expect(await db.select().from(schema.libraryStats).where(eq(schema.libraryStats.userId, 42))).toEqual([
            expect.objectContaining({ timeSpentMinutes: 0 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 600 }),
        ]);
    });

    it("imports exact common fields without manufacturing history or activity", async () => {
        const library = new GameLibraryCommands(new GameLibraryRepository());
        const imported = await library.importEntry({
            userId: 42,
            catalogItemId: 1000,
            status: Status.ENDLESS,
            playtime: 12_345,
            platform: "Switch",
            rating: 8,
            favorite: true,
            customCover: "imported.jpg",
            addedAt: null,
            updatedAt: "2025-04-03 12:00:00",
        });

        expect(imported).toMatchObject({
            favorite: true,
            customCover: "imported.jpg",
            addedAt: null,
            updatedAt: "2025-04-03 12:00:00",
            progress: { status: Status.ENDLESS, playtimeMinutes: 12_345, platform: "Switch" },
        });
        expect(await db.select().from(schema.libraryActivity)).toEqual([]);
        expect(await db.select().from(schema.libraryChange)).toEqual([]);
    });

    it("serves playtime activity and advanced game statistics through explicit scopes", async () => {
        await db.update(schema.catalogItem).set({ releaseDate: "2024-04-05" });
        await db.update(schema.gameDetails).set({ gameEngine: "Engine", playerPerspective: "First person" });
        await db.insert(schema.catalogGenre).values({ id: 1, name: "Role-playing" });
        await db.insert(schema.catalogItemGenre).values({ catalogItemId: 1000, genreId: 1 });
        await db.insert(schema.gameCompany).values({ catalogItemId: 1000, name: "Studio", developer: true, publisher: true });

        const repository = new GameLibraryRepository();
        const library = new GameLibraryCommands(repository);
        const entry = await library.importEntry({
            userId: 42,
            catalogItemId: 1000,
            status: Status.PLAYING,
            playtime: 5_400,
            platform: "PC",
            rating: 8,
            comment: "Good",
            favorite: true,
        });
        await repository.common.editTag({
            userId: 42,
            kind: MediaType.GAMES,
            action: TagAction.ADD,
            name: "comfort",
            libraryEntryId: entry.id,
        });
        await library.replacePlaytime({ userId: 42, catalogItemId: 1000, playtime: 6_000, loggedAt: "2026-06-02" });
        await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED, loggedAt: "2026-06-02" });
        await library.synchronizeProfileChannel({ userId: 42, enabled: true, views: 4 });

        const access = { ownerId: 42, actorId: 42, reason: "owner", mediaTypeEnabled: true } as const;
        const activity = ActivityRepository;
        expect(await activity.getStatsActivities(access, [MediaType.GAMES], "2026-06")).toEqual([
            { mediaId: 1000, mediaType: MediaType.GAMES, specificGained: 600 },
        ]);
        expect(await activity.getPaginatedActivities(access, {
            timeBucket: "2026-06",
            activityKind: ActivityKind.COMPLETED,
        })).toMatchObject({
            total: 1,
            items: [expect.objectContaining({ mediaId: 1000, specificGained: 600 })],
        });

        const { GameStatsReadRepository } = await import("./game-stats-read.repository");
        const stats = new GameStatsReadRepository();
        const scope = { type: "library", access } as const;
        expect(await stats.getAggregatedMediaStats(scope)).toMatchObject({
            totalEntries: 1,
            timeSpentHours: 100,
            totalRated: 1,
            avgRated: 8,
        });
        expect(await stats.getAdvancedMediaStats(scope, 8)).toMatchObject({
            totalTags: 1,
            avgDuration: 100,
            durationDistrib: [{ name: "64", value: 1 }],
            releaseDates: [{ name: 2020, value: 1 }],
            genresStats: [],
            developersStats: [],
            publishersStats: [],
            platformsStats: [],
            enginesStats: [],
            perspectivesStats: [],
            ratings: expect.arrayContaining([{ name: "8.0", value: 1 }]),
        });
    });
});
