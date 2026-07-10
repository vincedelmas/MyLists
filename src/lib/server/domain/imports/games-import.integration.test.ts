import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {games, gamesList, importItems, importJobs, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiProviderType, ImportItemStatus, ImportJobStatus, ImportSource, MediaType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: async <T>(action: () => Promise<T>) => action(),
}));


const { ImportService } = await import("@/lib/server/domain/imports/import.service");
const { GamesService } = await import("@/lib/server/domain/media/games/games.service");
const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");
const { GamesMatcher } = await import("@/lib/server/domain/imports/matchers/games.matcher");
const { GamesRepository } = await import("@/lib/server/domain/media/games/games.repository");
const { ImportJobProcessor } = await import("@/lib/server/domain/imports/import-job.processor");
const { MediaMatcherRegistry } = await import("@/lib/server/domain/imports/matchers/media-matcher.registry");


describe("games import processing", () => {
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
            name: "import-user",
            email: "import-user@example.com",
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
        });
        await db.insert(games).values({
            id: 100,
            apiId: 114795,
            name: "Hades",
            imageCover: "hades.jpg",
            releaseDate: "2020-09-17",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("matches an internal game, adds it to the user list, and completes the import job", async () => {
        const importService = new ImportService(ImportRepository);
        const gamesService = new GamesService(new GamesRepository());
        const matcherRegistry = new MediaMatcherRegistry();
        matcherRegistry.register(MediaType.GAMES, GamesMatcher.create(gamesService, {} as any));
        const processor = new ImportJobProcessor(importService, matcherRegistry);

        const job = await ImportRepository.createJob(42, ImportSource.MYLISTS);
        await ImportRepository.insertParsedItems(job.id, [{
            rowNumber: 2,
            name: "Hades",
            releaseDate: "2020",
            mediaType: MediaType.GAMES,
            statusReason: null,
            externalApiId: "114795",
            externalApiSource: ApiProviderType.IGDB,
            payload: {
                rating: 9,
                playtime: 480,
                platform: "PC",
                status: Status.COMPLETED,
            },
            status: ImportItemStatus.QUEUED,
        }]);
        await ImportRepository.markJobQueued(job.id, 1, 0);

        await expect(processor.processNextJob()).resolves.toMatchObject({
            id: job.id,
            status: ImportJobStatus.COMPLETED,
            completedCount: 1,
            processedCount: 1,
        });

        const [storedListItem] = await db.select().from(gamesList).where(eq(gamesList.userId, 42));
        const [storedImportItem] = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));

        expect(storedListItem).toMatchObject({
            userId: 42,
            mediaId: 100,
            rating: 9,
            playtime: 480,
            platform: "PC",
            status: Status.COMPLETED,
        });
        expect(storedImportItem).toMatchObject({
            matchedMediaId: 100,
            status: ImportItemStatus.COMPLETED,
        });
        expect(storedJob).toMatchObject({
            failedCount: 0,
            skippedCount: 0,
            completedCount: 1,
            processedCount: 1,
            status: ImportJobStatus.COMPLETED,
        });
    });
});
