import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertBooksWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { BookCatalogIngestionRepository } = await import("./book-catalog-ingestion.repository");


describe("v2 book ingestion adapter", () => {
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

    it("reuses Google Books identity and refreshes concrete metadata and associations", async () => {
        const provider = {
            source: "google-books" as const,
            mediaType: MediaType.BOOKS,
            search: { search: vi.fn() },
            details: { getDetails: vi.fn(async () => details("Old Author", 400)) },
        } satisfies ExternalMediaProvider<UpsertBooksWithDetails>;
        const ingestion = createMediaIngestionService({
            provider,
            repository: new BookCatalogIngestionRepository(),
        });

        const catalogItemId = await ingestion.storeFromExternal("volume-777");
        expect(await ingestion.storeFromExternal("volume-777")).toBe(catalogItemId);
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);

        provider.details.getDetails = vi.fn(async () => details("New Author", 412));
        await ingestion.refreshFromExternal("volume-777");

        expect(await db.select().from(schema.catalogItem)).toEqual([
            expect.objectContaining({
                id: catalogItemId,
                kind: MediaType.BOOKS,
                primaryProvider: "google-books",
                primaryExternalId: "volume-777",
                name: "Book",
            }),
        ]);
        expect(await db.select().from(schema.bookDetails)).toEqual([
            { catalogItemId, pages: 412, language: "en", publisher: "Publisher" },
        ]);
        expect(await db.select().from(schema.bookAuthor)).toEqual([
            expect.objectContaining({ catalogItemId, name: "New Author" }),
        ]);
        expect(await db.select().from(schema.catalogItemGenre)).toHaveLength(1);
    });
});


const details = (author: string, pages: number): UpsertBooksWithDetails => ({
    mediaData: {
        apiId: "volume-777",
        name: "Book",
        imageCover: "book.jpg",
        pages,
        language: "en",
        publishers: "Publisher",
    },
    authorsData: [{ name: author }],
    genresData: [{ name: "Fantasy" }],
});
