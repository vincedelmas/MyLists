import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status} from "@/lib/utils/enums";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {BookCatalogSnapshot} from "@/lib/server/domain/catalog/catalog-ingestion.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: (tx: unknown) => Promise<unknown>) => dbContext.db.transaction(action),
}));

const { BookCatalogIngestionRepository } = await import("./book-catalog-ingestion.repository");
const { BookCatalogIngestionCommand } = await import("./book-catalog-ingestion.command");
const { BookLibraryCommands } = await import("@/lib/server/domain/media/books/library/book-library.commands");
const { BookLibraryRepository } = await import("@/lib/server/domain/media/books/library/book-library.repository");
const { BookCatalogAdminRepository } = await import("./book-catalog-admin.repository");
const { BookCatalogEditCommand } = await import("./book-catalog-edit.command");


describe("book catalog ingestion command", () => {
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
            name: "book-owner",
            email: "book-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        }).run();
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
        } satisfies ExternalMediaProvider<BookCatalogSnapshot>;
        const ingestion = createMediaIngestionService({
            provider,
            catalog: new BookCatalogIngestionCommand(new BookCatalogIngestionRepository()),
        });

        const catalogItemId = await ingestion.storeFromExternal("volume-777");
        expect(await ingestion.storeFromExternal("volume-777")).toBe(catalogItemId);
        expect(provider.details.getDetails).toHaveBeenCalledTimes(1);

        const library = new BookLibraryCommands(new BookLibraryRepository());
        await library.add({ userId: 42, catalogItemId, status: Status.COMPLETED });
        await library.replaceRereads({ userId: 42, catalogItemId, rereadCount: 1 });

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
        expect((await new BookLibraryRepository().findEntry(42, catalogItemId))?.progress).toEqual({
            status: Status.COMPLETED,
            currentPage: 412,
            rereadCount: 1,
            totalPagesRead: 824,
        });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ totalSpecific: 824, totalRedo: 1 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 800 }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toHaveLength(2);

        const edit = new BookCatalogEditCommand(new BookCatalogAdminRepository());
        await edit.updateEditableFields(catalogItemId, { pages: 420 });
        expect((await new BookLibraryRepository().findEntry(42, catalogItemId))?.progress).toMatchObject({
            currentPage: 420,
            totalPagesRead: 840,
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


const details = (author: string, pages: number): BookCatalogSnapshot => ({
    apiId: "volume-777",
    name: "Book",
    imageCover: "book.jpg",
    pages,
    language: "en",
    publisher: "Publisher",
    authors: [author],
    genres: ["Fantasy"],
});
