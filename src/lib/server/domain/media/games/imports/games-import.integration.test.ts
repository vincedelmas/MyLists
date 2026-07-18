import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {importItems, importJobs, user} from "@/lib/server/database/schema";
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
const { ImportRepository } = await import("@/lib/server/domain/imports/import.repository");
const { createGamesMatcher } = await import("@/lib/server/domain/media/games/imports/games.matcher");
const { ImportJobProcessor } = await import("@/lib/server/domain/imports/import-job.processor");
const { GameLibraryService } = await import("@/lib/server/domain/media/games/library/game-library.service");
const { GameCatalogIngestionRepository } = await import("@/lib/server/domain/media/games/catalog/game-catalog-ingestion.repository");


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
        await db.insert(schema.catalogItem).values({
            id: 1000, kind: MediaType.GAMES, primaryProvider: ApiProviderType.IGDB,
            primaryExternalId: "114795", name: "Hades", imageCover: "hades.jpg",
        });
        await db.insert(schema.gameDetails).values({ catalogItemId: 1000 });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("matches an internal game, adds it to the user list, and completes the import job", async () => {
        const importService = new ImportService(ImportRepository);
        const matcher = createGamesMatcher(
            new GameCatalogIngestionRepository(),
            { storeBatchFromExternal: vi.fn() } as any,
            new GameLibraryService(),
        );
        const processor = new ImportJobProcessor(importService, { get: () => matcher });

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

        const storedListItem = await db.select({
            userId: schema.libraryEntry.userId,
            catalogItemId: schema.libraryEntry.catalogItemId,
            rating: schema.libraryEntry.rating,
            status: schema.libraryEntry.status,
            playtime: schema.gameProgress.playtimeMinutes,
            platform: schema.gameProgress.platform,
        }).from(schema.libraryEntry).innerJoin(
            schema.gameProgress, eq(schema.gameProgress.libraryEntryId, schema.libraryEntry.id),
        ).where(eq(schema.libraryEntry.userId, 42)).get();
        const [storedImportItem] = await db.select().from(importItems).where(eq(importItems.jobId, job.id));
        const [storedJob] = await db.select().from(importJobs).where(eq(importJobs.id, job.id));

        expect(storedListItem).toMatchObject({
            userId: 42,
            catalogItemId: 1000,
            rating: 9,
            playtime: 480,
            platform: "PC",
            status: Status.COMPLETED,
        });
        expect(storedImportItem).toMatchObject({
            matchedMediaId: 1000,
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
