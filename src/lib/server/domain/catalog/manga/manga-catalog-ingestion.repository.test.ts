import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: (tx: unknown) => Promise<unknown>) => dbContext.db.transaction(action),
}));

const { MangaCatalogIngestionRepository } = await import("./manga-catalog-ingestion.repository");
const { MangaCatalogIngestionCommand } = await import("./manga-catalog-ingestion.command");
const { MangaLibraryCommands } = await import("@/lib/server/domain/library/manga/manga-library.commands");
const { MangaLibraryRepository } = await import("@/lib/server/domain/library/manga/manga-library.repository");
const { MangaCatalogAdminRepository } = await import("./manga-catalog-admin.repository");
const { MangaCatalogEditCommand } = await import("./manga-catalog-edit.command");


describe("manga catalog ingestion command", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        db.insert(schema.user).values({
            id: 42,
            name: "manga-owner",
            email: "manga-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        }).run();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("reuses Jikan identity and refreshes concrete metadata and associations", async () => {
        const provider = {
            source: "jikan" as const,
            mediaType: MediaType.MANGA,
            search: { search: vi.fn() },
            details: { getDetails: vi.fn(async () => details("Old Author", 400, "Publishing")) },
        } satisfies ExternalMediaProvider<UpsertMangaWithDetails>;
        const ingestion = createMediaIngestionService({
            provider,
            repository: new MangaCatalogIngestionCommand(new MangaCatalogIngestionRepository()),
        });

        const catalogItemId = await ingestion.storeFromExternal(777);
        expect(await ingestion.storeFromExternal(777)).toBe(catalogItemId);
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);

        const library = new MangaLibraryCommands(new MangaLibraryRepository());
        await library.add({ userId: 42, catalogItemId, status: Status.COMPLETED });
        await library.replaceRereads({ userId: 42, catalogItemId, rereadCount: 1 });

        provider.details.getDetails = vi.fn(async () => details("New Author", 412, "Finished"));
        await ingestion.refreshFromExternal(777);

        expect(await db.select().from(schema.catalogItem)).toEqual([
            expect.objectContaining({
                id: catalogItemId,
                kind: MediaType.MANGA,
                primaryProvider: "jikan",
                primaryExternalId: "777",
                name: "Manga",
            }),
        ]);
        expect(await db.select().from(schema.mangaDetails)).toEqual([
            expect.objectContaining({
                catalogItemId,
                chapters: 412,
                productionStatus: "Finished",
                publisher: "Serialization",
            }),
        ]);
        expect(await db.select().from(schema.mangaAuthor)).toEqual([
            expect.objectContaining({ catalogItemId, name: "New Author" }),
        ]);
        expect(await db.select().from(schema.catalogItemGenre)).toHaveLength(1);
        expect((await new MangaLibraryRepository().findEntry(42, catalogItemId))?.progress).toEqual({
            status: Status.COMPLETED,
            currentChapter: 412,
            rereadCount: 1,
            totalChaptersRead: 824,
        });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ totalSpecific: 824, totalRedo: 1 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 800 }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toHaveLength(2);

        const edit = new MangaCatalogEditCommand(new MangaCatalogAdminRepository());
        await edit.updateEditableFields(catalogItemId, { chapters: 420 });
        expect((await new MangaLibraryRepository().findEntry(42, catalogItemId))?.progress).toMatchObject({
            currentChapter: 420,
            totalChaptersRead: 840,
        });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ totalSpecific: 840, totalRedo: 1 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 800 }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toHaveLength(2);
    });
});


const details = (author: string, chapters: number | null, prodStatus: string): UpsertMangaWithDetails => ({
    mediaData: {
        apiId: 777,
        name: "Manga",
        originalName: "Original Manga",
        imageCover: "manga.jpg",
        chapters,
        prodStatus,
        volumes: 40,
        siteUrl: "https://example.com/manga/777",
        publishers: "Serialization",
        popularity: 1,
        voteAverage: 9.1,
        voteCount: 1000,
    },
    authorsData: [{ name: author }],
    genresData: [{ name: "Fantasy" }],
});
