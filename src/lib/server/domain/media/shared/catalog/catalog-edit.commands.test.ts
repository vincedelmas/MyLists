import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {
    bookCatalogEditPayloadSchema,
    gameCatalogEditPayloadSchema,
    mangaCatalogEditPayloadSchema,
    movieCatalogEditPayloadSchema,
    tvCatalogEditPayloadSchema,
} from "@/lib/contracts/media/catalog-edit";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
    withTransaction: (action: () => Promise<unknown>) => action(),
}));

const { TvCatalogAdminRepository } = await import("../../tv/catalog/tv-catalog-admin.repository");
const { TvCatalogEditCommand } = await import("../../tv/catalog/tv-catalog-edit.command");
const { MovieCatalogAdminRepository } = await import("../../movies/catalog/movie-catalog-admin.repository");
const { MovieCatalogEditCommand } = await import("../../movies/catalog/movie-catalog-edit.command");
const { GameCatalogAdminRepository } = await import("../../games/catalog/game-catalog-admin.repository");
const { GameCatalogEditCommand } = await import("../../games/catalog/game-catalog-edit.command");
const { BookCatalogAdminRepository } = await import("../../books/catalog/book-catalog-admin.repository");
const { BookCatalogEditCommand } = await import("../../books/catalog/book-catalog-edit.command");
const { MangaCatalogAdminRepository } = await import("../../manga/catalog/manga-catalog-admin.repository");
const { MangaCatalogEditCommand } = await import("../../manga/catalog/manga-catalog-edit.command");


describe("normalized catalog manager edits", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let series: InstanceType<typeof TvCatalogEditCommand>;
    let anime: InstanceType<typeof TvCatalogEditCommand>;
    let movies: InstanceType<typeof MovieCatalogEditCommand>;
    let games: InstanceType<typeof GameCatalogEditCommand>;
    let books: InstanceType<typeof BookCatalogEditCommand>;
    let manga: InstanceType<typeof MangaCatalogEditCommand>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        series = new TvCatalogEditCommand(new TvCatalogAdminRepository(MediaType.SERIES));
        anime = new TvCatalogEditCommand(new TvCatalogAdminRepository(MediaType.ANIME));
        movies = new MovieCatalogEditCommand(new MovieCatalogAdminRepository());
        games = new GameCatalogEditCommand(new GameCatalogAdminRepository());
        books = new BookCatalogEditCommand(new BookCatalogAdminRepository());
        manga = new MangaCatalogEditCommand(new MangaCatalogAdminRepository());

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
        await series.update(101, tvCatalogEditPayloadSchema.parse({ name: "Edited Series", duration: "50", lockStatus: "true" }));
        await anime.update(102, tvCatalogEditPayloadSchema.parse({ name: "Edited Anime" }));
        await movies.update(103, movieCatalogEditPayloadSchema.parse({ duration: "120", budget: "1000" }));
        await games.update(104, gameCatalogEditPayloadSchema.parse({ gameEngine: "Engine", hltbMainTime: "" }));
        await books.update(105, bookCatalogEditPayloadSchema.parse({ pages: "400", authors: [{ name: "Secondary" }, { name: "Primary" }] }));
        await manga.update(106, mangaCatalogEditPayloadSchema.parse({ chapters: "", publishers: "Publisher", genres: [{ name: "Drama" }] }));

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
        await expect(db.select().from(schema.catalogGenre)).resolves.toEqual([
            expect.objectContaining({ name: "Drama" }),
        ]);
    });

    it("can clear structured catalog relations", async () => {
        await db.insert(schema.catalogGenre).values({ id: 1, name: "Drama" });
        await db.insert(schema.catalogItemGenre).values({ catalogItemId: 106, genreId: 1 });

        await books.update(105, bookCatalogEditPayloadSchema.parse({ authors: [] }));
        await manga.update(106, mangaCatalogEditPayloadSchema.parse({ genres: [] }));

        await expect(db.select().from(schema.bookAuthor)).resolves.toEqual([]);
        await expect(db.select().from(schema.catalogItemGenre)).resolves.toEqual([]);
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
