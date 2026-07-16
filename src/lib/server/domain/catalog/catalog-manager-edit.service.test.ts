import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const {CatalogManagerEditService} = await import("./catalog-manager-edit.service");
const {TvCatalogAdminRepository} = await import("./tv/tv-catalog-admin.repository");
const {MovieCatalogAdminRepository} = await import("./movies/movie-catalog-admin.repository");
const {GameCatalogAdminRepository} = await import("./games/game-catalog-admin.repository");
const {BookCatalogAdminRepository} = await import("./books/book-catalog-admin.repository");
const {MangaCatalogAdminRepository} = await import("./manga/manga-catalog-admin.repository");


describe("normalized catalog manager edits", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let service: InstanceType<typeof CatalogManagerEditService>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        service = new CatalogManagerEditService(
            {
                [MediaType.SERIES]: new TvCatalogAdminRepository(MediaType.SERIES),
                [MediaType.ANIME]: new TvCatalogAdminRepository(MediaType.ANIME),
            },
            new MovieCatalogAdminRepository(),
            new GameCatalogAdminRepository(),
            new BookCatalogAdminRepository(),
            new MangaCatalogAdminRepository(),
        );

        await db.insert(schema.catalogItem).values([
            catalog(101, MediaType.SERIES, "tmdb"),
            catalog(102, MediaType.ANIME, "tmdb"),
            catalog(103, MediaType.MOVIES, "tmdb"),
            catalog(104, MediaType.GAMES, "igdb"),
            catalog(105, MediaType.BOOKS, "google-books"),
            catalog(106, MediaType.MANGA, "jikan"),
        ]);
        await db.insert(schema.tvDetails).values([
            { catalogItemId: 101, episodeDurationMinutes: 45 },
            { catalogItemId: 102, episodeDurationMinutes: 24 },
        ]);
        await db.insert(schema.movieDetails).values({ catalogItemId: 103, durationMinutes: 90 });
        await db.insert(schema.gameDetails).values({ catalogItemId: 104, hltbMainHours: 12 });
        await db.insert(schema.bookDetails).values({ catalogItemId: 105, pages: 300 });
        await db.insert(schema.mangaDetails).values({ catalogItemId: 106, chapters: 50 });
        await db.insert(schema.bookAuthor).values([
            { catalogItemId: 105, name: "Primary", position: 1 },
            { catalogItemId: 105, name: "Secondary", position: 2 },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("normalizes form values through explicit family commands", async () => {
        await service.update(MediaType.SERIES, 101, { name: "Edited Series", duration: "50", lockStatus: "true" });
        await service.update(MediaType.ANIME, 102, { name: "Edited Anime" });
        await service.update(MediaType.MOVIES, 103, { duration: "120", budget: "1000" });
        await service.update(MediaType.GAMES, 104, { gameEngine: "Engine", hltbMainTime: "" });
        await service.update(MediaType.BOOKS, 105, { pages: "400", authors: "Secondary, Primary" });
        await service.update(MediaType.MANGA, 106, { chapters: "", publishers: "Publisher" });

        await expect(db.select().from(schema.catalogItem)).resolves.toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 101, name: "Edited Series", locked: true }),
            expect.objectContaining({ id: 102, name: "Edited Anime" }),
        ]));
        await expect(db.select().from(schema.tvDetails)).resolves.toEqual(expect.arrayContaining([
            expect.objectContaining({ catalogItemId: 101, episodeDurationMinutes: 50 }),
        ]));
        await expect(db.select().from(schema.movieDetails)).resolves.toEqual([
            expect.objectContaining({ catalogItemId: 103, durationMinutes: 120, budget: 1000 }),
        ]);
        await expect(db.select().from(schema.gameDetails)).resolves.toEqual([
            expect.objectContaining({ catalogItemId: 104, gameEngine: "Engine", hltbMainHours: null }),
        ]);
        await expect(db.select().from(schema.bookDetails)).resolves.toEqual([
            expect.objectContaining({ catalogItemId: 105, pages: 400 }),
        ]);
        await expect(db.select().from(schema.bookAuthor)).resolves.toEqual([
            expect.objectContaining({ catalogItemId: 105, name: "Secondary", position: 1 }),
            expect.objectContaining({ catalogItemId: 105, name: "Primary", position: 2 }),
        ]);
        await expect(db.select().from(schema.mangaDetails)).resolves.toEqual([
            expect.objectContaining({ catalogItemId: 106, chapters: null, publisher: "Publisher" }),
        ]);
    });
});


const catalog = (
    id: number,
    kind: MediaType,
    primaryProvider: "tmdb" | "igdb" | "google-books" | "jikan",
) => ({
    id,
    kind,
    primaryProvider,
    primaryExternalId: String(id),
    name: `${kind}-${id}`,
    imageCover: `${id}.jpg`,
});

