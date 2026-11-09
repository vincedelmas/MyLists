import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {
    games,
    gamesCompanies,
    gamesGenre,
    gamesPlatforms,
    series,
    seriesActors,
    seriesEpisodesPerSeason,
    seriesGenre,
    seriesNetwork,
} from "@/lib/server/database/schema";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { createGamesRepository } = await import("@/lib/server/domain/media/games/games.repository");
const { createTvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");
const { createMoviesRepository } = await import("@/lib/server/domain/media/movies/movies.repository");
const { createBooksRepository } = await import("@/lib/server/domain/media/books/books.repository");
const { createMangaRepository } = await import("@/lib/server/domain/media/manga/manga.repository");


describe("media relation deduplication", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(games).values({
            id: 6651,
            apiId: 11597,
            name: "Poly Bridge",
            imageCover: "poly-bridge.jpg",
        });
        await db.insert(series).values({
            id: 6358,
            apiId: 110492,
            name: "Series",
            duration: 45,
            totalSeasons: 2,
            totalEpisodes: 16,
            imageCover: "series.jpg",
        });
        db.insert(schema.anime).values({ id: 1, apiId: 1, name: "Anime", duration: 24, totalSeasons: 1, totalEpisodes: 12, imageCover: "anime.jpg" }).run();
        db.insert(schema.movies).values({ id: 1, apiId: 1, name: "Movie", duration: 90, imageCover: "movie.jpg" }).run();
        db.insert(schema.books).values({ id: 1, apiId: "book", name: "Book", pages: 100, imageCover: "book.jpg" }).run();
        db.insert(schema.manga).values({ id: 1, apiId: 1, name: "Manga", imageCover: "manga.jpg" }).run();
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each([
        { name: "games", create: createGamesRepository, id: 6651, fields: ["genres", "companies", "platforms", "collection"] },
        { name: "series", create: () => createTvRepository(seriesServerDefinition), id: 6358, fields: ["actors", "genres", "networks", "epsPerSeason"] },
        { name: "anime", create: () => createTvRepository(animeServerDefinition), id: 1, fields: ["actors", "genres", "networks", "epsPerSeason"] },
        { name: "movies", create: createMoviesRepository, id: 1, fields: ["actors", "genres", "collection"] },
        { name: "books", create: createBooksRepository, id: 1, fields: ["authors", "genres"] },
        { name: "manga", create: createMangaRepository, id: 1, fields: ["authors", "genres"] },
    ])("returns empty relation arrays and no phantom missing record for $name", async ({ create, id, fields }) => {
        const repository = create();
        expect(await repository.findAllAssociatedDetails(id))
            .toMatchObject(Object.fromEntries(fields.map(field => [field, []])));
        expect(await repository.findAllAssociatedDetails(999999)).toBeUndefined();
    });

    it("returns independent TV relations and seasons in numeric order", async () => {
        db.insert(seriesActors).values([{ mediaId: 6358, name: "Actor A" }, { mediaId: 6358, name: "Actor B" }]).run();
        db.insert(seriesGenre).values([{ mediaId: 6358, name: "Drama" }, { mediaId: 6358, name: "Comedy" }]).run();
        db.insert(seriesNetwork).values([{ mediaId: 6358, name: "Network A" }, { mediaId: 6358, name: "Network B" }]).run();
        db.insert(seriesEpisodesPerSeason).values([{ mediaId: 6358, season: 2, episodes: 8 }, { mediaId: 6358, season: 1, episodes: 10 }]).run();

        expect(await createTvRepository(seriesServerDefinition).findAllAssociatedDetails(6358)).toMatchObject({
            actors: [{ name: "Actor A" }, { name: "Actor B" }],
            genres: [{ name: "Drama" }, { name: "Comedy" }],
            networks: [{ name: "Network A" }, { name: "Network B" }],
            epsPerSeason: [{ season: 1, episodes: 10 }, { season: 2, episodes: 8 }],
        });
    });

    it("preserves named relations across books, manga and movies", async () => {
        db.insert(schema.booksAuthors).values({ mediaId: 1, name: "Book Author" }).run();
        db.insert(schema.booksGenre).values({ mediaId: 1, name: "Fiction" }).run();
        db.insert(schema.mangaAuthors).values({ mediaId: 1, name: "Manga Author" }).run();
        db.insert(schema.mangaGenre).values({ mediaId: 1, name: "Adventure" }).run();
        db.insert(schema.moviesActors).values({ mediaId: 1, name: "Movie Actor" }).run();
        db.insert(schema.moviesGenre).values({ mediaId: 1, name: "Thriller" }).run();

        expect(await createBooksRepository().findAllAssociatedDetails(1)).toMatchObject({ authors: [{ name: "Book Author" }], genres: [{ name: "Fiction" }] });
        expect(await createMangaRepository().findAllAssociatedDetails(1)).toMatchObject({ authors: [{ name: "Manga Author" }], genres: [{ name: "Adventure" }] });
        expect(await createMoviesRepository().findAllAssociatedDetails(1)).toMatchObject({ actors: [{ name: "Movie Actor" }], genres: [{ name: "Thriller" }] });
    });

    it("keeps game and movie collections scoped, ordered and excluding the current media", async () => {
        db.update(games).set({ collectionId: 10 }).where(eq(games.id, 6651)).run();
        db.update(schema.movies).set({ collectionId: 10 }).where(eq(schema.movies.id, 1)).run();
        const related = [
            { id: 2, apiId: 2, name: "Later", imageCover: "later.jpg", collectionId: 10, releaseDate: "2025-01-01" },
            { id: 3, apiId: 3, name: "Earlier", imageCover: "earlier.jpg", collectionId: 10, releaseDate: "2020-01-01" },
            { id: 4, apiId: 4, name: "Unrelated", imageCover: "other.jpg", collectionId: 20, releaseDate: "2010-01-01" },
        ];
        db.insert(games).values(related).run();
        db.insert(schema.movies).values(related.map(item => ({ ...item, duration: 90 }))).run();

        const game = await createGamesRepository().findAllAssociatedDetails(6651);
        const movie = await createMoviesRepository().findAllAssociatedDetails(1);
        for (const details of [game, movie]) {
            expect(details?.collection).toMatchObject([
                { mediaId: 3, mediaName: "Earlier", mediaCover: expect.stringContaining("earlier.jpg") },
                { mediaId: 2, mediaName: "Later", mediaCover: expect.stringContaining("later.jpg") },
            ]);
        }
    });

    it("refreshes a game when every relation payload contains duplicates", async () => {
        const repository = createGamesRepository();
        const duplicateCompany = { name: "Dry Cactus", developer: true, publisher: true };
        const details = {
            mediaData: {
                apiId: 11597,
                name: "Poly Bridge",
                imageCover: "poly-bridge.jpg",
            },
            companiesData: [duplicateCompany, duplicateCompany],
            platformsData: [{ name: "PC" }, { name: "PC" }],
            genresData: [{ name: "Puzzle" }, { name: "Puzzle" }],
        };

        await repository.updateMediaWithDetails(details);
        await repository.storeMediaWithDetails(details);

        await expect(db.select().from(gamesCompanies).where(eq(gamesCompanies.mediaId, 6651)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(gamesPlatforms).where(eq(gamesPlatforms.mediaId, 6651)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(gamesGenre).where(eq(gamesGenre.mediaId, 6651)))
            .resolves.toHaveLength(1);
        expect(await repository.findAllAssociatedDetails(6651)).toMatchObject({
            companies: [{ name: "Dry Cactus", developer: 1, publisher: 1 }],
            genres: [{ name: "Puzzle" }],
            platforms: [{ name: "PC" }],
        });
    });

    it("refreshes a series when actor and other relation payloads contain duplicates", async () => {
        const repository = createTvRepository(seriesServerDefinition);
        const details = {
            mediaData: {
                apiId: 110492,
                name: "Series",
                duration: 45,
                totalSeasons: 2,
                totalEpisodes: 16,
                imageCover: "series.jpg",
            },
            actorsData: [{ name: "Actor" }, { name: "Actor" }],
            genresData: [{ name: "Drama" }, { name: "Drama" }],
            networkData: [{ name: "Network" }, { name: "Network" }],
            seasonsData: [
                { season: 1, episodes: 8 },
                { season: 1, episodes: 8 },
            ],
        };

        await repository.updateMediaWithDetails(details);
        await repository.storeMediaWithDetails(details);

        await expect(db.select().from(seriesActors).where(eq(seriesActors.mediaId, 6358)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(seriesGenre).where(eq(seriesGenre.mediaId, 6358)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(seriesNetwork).where(eq(seriesNetwork.mediaId, 6358)))
            .resolves.toHaveLength(1);
        await expect(db.select().from(seriesEpisodesPerSeason).where(eq(seriesEpisodesPerSeason.mediaId, 6358)))
            .resolves.toHaveLength(1);
    });
});
