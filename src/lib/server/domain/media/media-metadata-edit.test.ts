import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {MediaType} from "@/lib/utils/enums";
import {createMediaEditPayloadSchema, editMediaDetailsPayloadSchemas} from "@/lib/schemas/media-details.schema";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {type BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));

vi.mock("@/lib/server/database/db", () => ({
    get db() {
        return dbContext.db;
    },
}));
vi.mock("@/lib/server/core/images/image-saver", () => ({ saveImageFromUrl: vi.fn().mockResolvedValue("updated.jpg") }));

const { createMoviesRepository, createMoviesService } = await import("@/lib/server/domain/media/movies");
const { createGamesRepository, createGamesService } = await import("@/lib/server/domain/media/games");
const { createBooksRepository, createBooksService } = await import("@/lib/server/domain/media/books");
const { createMangaRepository, createMangaService } = await import("@/lib/server/domain/media/manga");
const { createTvRepository, createTvService } = await import("@/lib/server/domain/media/tv");
const { saveImageFromUrl } = await import("@/lib/server/core/images/image-saver");
const { mangaServerDefinition } = await import("@/lib/media-definitions/manga/manga.definition.server");
const { booksServerDefinition } = await import("@/lib/media-definitions/books/book.definition.server");

const services = {
    [MediaType.MOVIES]: createMoviesService(createMoviesRepository()),
    [MediaType.GAMES]: createGamesService(createGamesRepository()),
    [MediaType.BOOKS]: createBooksService(createBooksRepository()),
    [MediaType.MANGA]: createMangaService(createMangaRepository()),
    [MediaType.SERIES]: createTvService(createTvRepository(seriesServerDefinition), seriesServerDefinition),
    [MediaType.ANIME]: createTvService(createTvRepository(animeServerDefinition), animeServerDefinition),
};


describe("validated metadata edits", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        vi.clearAllMocks();
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        const media = { id: 1, apiId: 100, name: "Original", imageCover: "original.jpg" };
        await db.insert(schema.movies).values({ ...media, duration: 120 });
        await db.insert(schema.games).values(media);
        await db.insert(schema.books).values({ ...media, apiId: "book-100", pages: 250 });
        await db.insert(schema.manga).values({ ...media, chapters: 50 });
        await db.insert(schema.series).values({ ...media, duration: 45, totalSeasons: 1, totalEpisodes: 10 });
        await db.insert(schema.anime).values({ ...media, duration: 24, totalSeasons: 1, totalEpisodes: 12 });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each(Object.values(MediaType))("updates only submitted fields for %s", async (mediaType) => {
        const service = services[mediaType];
        const before = service.findById(1)!;
        const payload = Object.freeze(editMediaDetailsPayloadSchemas[mediaType].parse({ name: "Updated", lockStatus: "false" }));

        await service.updateMediaEditableFields(1, payload);

        expect(service.findById(1)).toEqual({ ...before, name: "Updated", lockStatus: false, lastApiUpdate: expect.any(String) });
        expect(saveImageFromUrl).not.toHaveBeenCalled();
    });

    it.each([
        [MediaType.MOVIES, ["originalName", "name", "directorName", "releaseDate", "duration", "synopsis", "budget", "revenue", "tagline", "originalLanguage", "lockStatus", "homepage"]],
        [MediaType.GAMES, ["name", "gameEngine", "gameModes", "playerPerspective", "releaseDate", "synopsis", "hltbMainTime", "hltbMainAndExtraTime", "hltbTotalCompleteTime", "lockStatus"]],
        [MediaType.BOOKS, ["name", "releaseDate", "pages", "language", "publishers", "synopsis", "lockStatus", "authors"]],
        [MediaType.MANGA, ["name", "releaseDate", "chapters", "publishers", "synopsis", "lockStatus"]],
        [MediaType.SERIES, ["name", "originalName", "releaseDate", "lastAirDate", "homepage", "createdBy", "duration", "originCountry", "prodStatus", "synopsis", "lockStatus"]],
        [MediaType.ANIME, ["name", "originalName", "releaseDate", "lastAirDate", "homepage", "createdBy", "duration", "originCountry", "prodStatus", "synopsis", "lockStatus"]],
    ] as const)("returns ordered form fields that round-trip without changing metadata for %s", async (mediaType, expectedFields) => {
        await db.insert(schema.booksAuthors).values([{ mediaId: 1, name: "Author A" }, { mediaId: 1, name: "Author B" }]);
        await db.insert(schema.mangaGenre).values({ mediaId: 1, name: "Drama" });

        const service = services[mediaType];
        const before = service.findById(1)!;
        const { fields, editableFields } = await service.getMediaEditableFields(1);
        expect(Object.keys(fields)).toEqual(expectedFields);
        const separateFields = mediaType === MediaType.MANGA ? ["imageCover", "genres"] : ["imageCover"];
        expect([...Object.keys(fields), ...separateFields].sort())
            .toEqual([...editableFields].sort());

        // Text inputs send changed values as strings; untouched nullable fields stay null.
        const input = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value == null ? value : String(value)]));
        const payload = createMediaEditPayloadSchema(mediaType, editableFields).parse({ ...input, imageCover: "" });
        expect(payload).toEqual({ ...fields, imageCover: undefined });
        await service.updateMediaEditableFields(1, payload);

        expect(service.findById(1)).toEqual({ ...before, lastApiUpdate: expect.any(String) });
        expect(db.select({ name: schema.booksAuthors.name }).from(schema.booksAuthors).orderBy(schema.booksAuthors.name).all())
            .toEqual([{ name: "Author A" }, { name: "Author B" }]);
        expect(db.select({ name: schema.mangaGenre.name }).from(schema.mangaGenre).all()).toEqual([{ name: "Drama" }]);
        expect(saveImageFromUrl).not.toHaveBeenCalled();
    });

    it("returns empty book relations and an empty authors input when none are stored", async () => {
        const details = await createBooksRepository().findAllAssociatedDetails(1);
        expect(details).toMatchObject({ authors: [], genres: [] });
        expect((await services[MediaType.BOOKS].getMediaEditableFields(1)).fields.authors).toBe("");
    });

    it("uses the definition for form order and rejects disabled scalar, cover and relation edits before side effects", async () => {
        const definition = {
            ...mangaServerDefinition,
            service: { ...mangaServerDefinition.service, editableFields: ["publishers", "name"] as const },
        };
        const service = createMangaService(createMangaRepository(definition), definition);
        await db.insert(schema.mangaGenre).values({ mediaId: 1, name: "Drama" });
        const before = service.findById(1);
        const { fields, editableFields } = await service.getMediaEditableFields(1);
        expect(Object.keys(fields)).toEqual(["publishers", "name"]);
        expect(editableFields).toEqual(["publishers", "name"]);

        const formSchema = createMediaEditPayloadSchema(MediaType.MANGA, editableFields);
        expect(formSchema.safeParse(fields).success).toBe(true);
        for (const payload of [{ chapters: 60 }, { genres: [] }, { imageCover: "https://example.com/cover.jpg" }]) {
            // The value is valid, but the definition no longer permits editing it.
            expect(editMediaDetailsPayloadSchemas[MediaType.MANGA].safeParse(payload).success).toBe(true);
            expect(formSchema.safeParse(payload).success).toBe(false);
            await expect(service.updateMediaEditableFields(1, { name: "Must not be saved", ...payload })).rejects.toThrow();
        }
        expect(service.findById(1)).toEqual(before);
        expect(db.select({ name: schema.mangaGenre.name }).from(schema.mangaGenre).all()).toEqual([{ name: "Drama" }]);
        expect(saveImageFromUrl).not.toHaveBeenCalled();
    });

    it("does not expose or accept book authors when disabled in the definition", async () => {
        const definition = {
            ...booksServerDefinition,
            service: {
                ...booksServerDefinition.service,
                editableFields: booksServerDefinition.service.editableFields.filter(field => field !== "authors"),
            },
        };
        const service = createBooksService(createBooksRepository(definition), definition);
        await db.insert(schema.booksAuthors).values({ mediaId: 1, name: "Original author" });
        const { fields, editableFields } = await service.getMediaEditableFields(1);
        expect(fields).not.toHaveProperty("authors");
        expect(editableFields).not.toContain("authors");
        await expect(service.updateMediaEditableFields(1, { authors: "" })).rejects.toThrow();
        expect(db.select({ name: schema.booksAuthors.name }).from(schema.booksAuthors).all()).toEqual([{ name: "Original author" }]);
    });

    it("applies independent series and anime definitions despite shared validators", async () => {
        const definition = {
            ...animeServerDefinition,
            service: {
                ...animeServerDefinition.service,
                editableFields: animeServerDefinition.service.editableFields.filter(field => field !== "duration"),
            },
        };
        const service = createTvService(createTvRepository(definition), definition);
        expect((await service.getMediaEditableFields(1)).fields).not.toHaveProperty("duration");
        await expect(service.updateMediaEditableFields(1, { duration: 30 })).rejects.toThrow();
        await services[MediaType.SERIES].updateMediaEditableFields(1, { duration: 60 });
        expect(service.findById(1)?.duration).toBe(24);
        expect(services[MediaType.SERIES].findById(1)?.duration).toBe(60);
    });

    it("stores normalized numbers and downloaded cover filenames without changing the payload", async () => {
        const payload = Object.freeze(editMediaDetailsPayloadSchemas[MediaType.MOVIES].parse({
            duration: "95", imageCover: "https://example.com/new.jpg",
        }));
        await services[MediaType.MOVIES].updateMediaEditableFields(1, payload);

        expect(services[MediaType.MOVIES].findById(1)).toMatchObject({ duration: 95, imageCover: expect.stringContaining("updated.jpg") });
        expect(saveImageFromUrl).toHaveBeenCalledWith({ dirSaveName: "movies-covers", imageUrl: "https://example.com/new.jpg" });
        expect(payload.imageCover).toBe("https://example.com/new.jpg");
    });

    it("preserves omitted book authors and replaces or clears explicit authors", async () => {
        await db.insert(schema.booksAuthors).values({ mediaId: 1, name: "Original author" });
        const service = services[MediaType.BOOKS];
        await service.updateMediaEditableFields(1, { pages: 300 });
        expect(db.select().from(schema.booksAuthors).all()).toMatchObject([{ name: "Original author" }]);

        await service.updateMediaEditableFields(1, { authors: " Author A,Author A,Author B " });
        expect(db.select({ name: schema.booksAuthors.name }).from(schema.booksAuthors).all()).toEqual([{ name: "Author A" }, { name: "Author B" }]);

        await service.updateMediaEditableFields(1, { authors: "" });
        expect(db.select().from(schema.booksAuthors).all()).toEqual([]);
        expect(service.findById(1)?.pages).toBe(300);
    });

    it("preserves omitted manga genres and deduplicates or clears explicit genres", async () => {
        await db.insert(schema.mangaGenre).values({ mediaId: 1, name: "Original genre" });
        const service = services[MediaType.MANGA];
        await service.updateMediaEditableFields(1, { chapters: 100 });
        expect(db.select().from(schema.mangaGenre).all()).toMatchObject([{ name: "Original genre" }]);

        const payload = editMediaDetailsPayloadSchemas[MediaType.MANGA].parse({ genres: ["Drama", { name: "Drama" }, "Action"] });
        await service.updateMediaEditableFields(1, payload);
        expect(db.select({ name: schema.mangaGenre.name }).from(schema.mangaGenre).where(eq(schema.mangaGenre.mediaId, 1)).orderBy(schema.mangaGenre.name).all())
            .toEqual([{ name: "Action" }, { name: "Drama" }]);

        await service.updateMediaEditableFields(1, { genres: [] });
        expect(db.select().from(schema.mangaGenre).all()).toEqual([]);
        expect(service.findById(1)?.chapters).toBe(100);
    });
});
