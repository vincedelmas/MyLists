import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { MangaCatalogIngestionRepository } = await import("./manga-catalog-ingestion.repository");


describe("v2 manga ingestion adapter", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
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
            details: { getDetails: vi.fn(async () => details("Old Author", null, "Publishing")) },
        } satisfies ExternalMediaProvider<UpsertMangaWithDetails>;
        const ingestion = createMediaIngestionService({
            provider,
            repository: new MangaCatalogIngestionRepository(),
        });

        const catalogItemId = await ingestion.storeFromExternal(777);
        expect(await ingestion.storeFromExternal(777)).toBe(catalogItemId);
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);

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
