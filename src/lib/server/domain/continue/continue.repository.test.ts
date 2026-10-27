import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";

const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
const {getContinueItems} = await import("./continue.repository");
let sqlite: Database;

beforeEach(() => {
    sqlite = new Database(":memory:");
    dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
    migrate(dbContext.db, { migrationsFolder: "./drizzle" });
    sqlite.run("PRAGMA foreign_keys = ON");
    dbContext.db.insert(schema.user).values({ id: 1, name: "reader", email: "reader@example.invalid", emailVerified: true,
        createdAt: "2026-01-01", updatedAt: "2026-01-01" }).run();
    sqlite.query(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x < 1000)
        INSERT INTO games(id,api_id,name,image_cover) SELECT x,x,printf('Game %04d',x),'cover.jpg' FROM n`).run();
    sqlite.query("INSERT INTO games_list(user_id,media_id,status,playtime) SELECT 1,id,?,120 FROM games").run(Status.PLAYING);
});
afterEach(() => { sqlite.close(); dbContext.db = undefined; });

it("bounds the preview and page response while retaining totals and non-overlapping pages", async () => {
    const first = await getContinueItems(1, [MediaType.GAMES]);
    const second = await getContinueItems(1, [MediaType.GAMES], { page: 2 });
    const preview = await getContinueItems(1, [MediaType.GAMES], { preview: true });
    expect(first.items).toHaveLength(12);
    expect(preview.items).toHaveLength(5);
    expect(first.pagination).toEqual({ page: 1, perPage: 12, totalItems: 1000, totalPages: 84 });
    expect(second.items[0].mediaId).toBe(13);
    expect(second.items.some(item => first.items.some(previous => previous.mediaId === item.mediaId))).toBe(false);
    expect(first.counts).toEqual({ games: 1000 });
    expect((await getContinueItems(1, [MediaType.GAMES], { page: 999 })).items).toHaveLength(4);
    expect(await getContinueItems(1, [])).toMatchObject({ items: [], pagination: { totalItems: 0 } });
});

it("sorts across media types before limiting and keeps tab counts independent of the selected tab", async () => {
    dbContext.db.insert(schema.books).values({ id: 1, apiId: "book", name: "Most recent", imageCover: "book.jpg", pages: 100 }).run();
    dbContext.db.insert(schema.booksList).values({ userId: 1, mediaId: 1, status: Status.READING, lastUpdated: "2099-01-01" }).run();
    const mixed = await getContinueItems(1, [MediaType.GAMES, MediaType.BOOKS]);
    expect(mixed.items).toHaveLength(12);
    expect(mixed.items[0]).toMatchObject({ mediaId: 1, mediaType: MediaType.BOOKS });
    expect(mixed.counts).toEqual({ games: 1000, books: 1 });
    const books = await getContinueItems(1, [MediaType.GAMES, MediaType.BOOKS], { activeTab: MediaType.BOOKS });
    expect(books.items).toHaveLength(1);
    expect(books.pagination.totalItems).toBe(1);
    expect(books.counts).toEqual(mixed.counts);
});

it("filters finished books, manga, and TV using the shared completion rules before limiting the preview", async () => {
    dbContext.db.insert(schema.books).values(Array.from({ length: 9 }, (_, i) => ({
        id: i + 1, apiId: `book${i}`, name: `Book ${i}`, imageCover: "book.jpg", pages: i === 8 ? 0 : 100,
    }))).run();
    dbContext.db.insert(schema.booksList).values(Array.from({ length: 9 }, (_, i) => ({
        userId: 1, mediaId: i + 1, status: Status.READING, actualPage: i < 6 ? 100 : 0,
    }))).run();
    dbContext.db.insert(schema.manga).values([
        { id: 1, apiId: 1, name: "Finished manga", imageCover: "manga.jpg", chapters: 10 },
        { id: 2, apiId: 2, name: "Unknown length", imageCover: "manga.jpg", chapters: null },
    ]).run();
    dbContext.db.insert(schema.mangaList).values([
        { userId: 1, mediaId: 1, status: Status.READING, currentChapter: 10 },
        { userId: 1, mediaId: 2, status: Status.READING, currentChapter: 10 },
    ]).run();
    for (const [mediaTable, listTable, seasonsTable] of [
        [schema.series, schema.seriesList, schema.seriesEpisodesPerSeason],
        [schema.anime, schema.animeList, schema.animeEpisodesPerSeason],
    ] as const) {
        dbContext.db.insert(mediaTable).values(Array.from({ length: 4 }, (_, i) => ({
            id: i + 1, apiId: i + 1, name: `Show ${i}`, imageCover: "show.jpg", duration: 30, totalSeasons: 2, totalEpisodes: 20,
        }))).run();
        dbContext.db.insert(seasonsTable).values(Array.from({ length: 4 }, (_, i) => [
            { mediaId: i + 1, season: 1, episodes: 10 },
            { mediaId: i + 1, season: 2, episodes: i === 3 ? 0 : 10 },
        ]).flat()).run();
        dbContext.db.insert(listTable).values([
            { userId: 1, mediaId: 1, status: Status.WATCHING, currentSeason: 2, currentEpisode: 10 },
            { userId: 1, mediaId: 2, status: Status.WATCHING, currentSeason: 1, currentEpisode: 10 },
            { userId: 1, mediaId: 3, status: Status.WATCHING, currentSeason: 2, currentEpisode: 9 },
            { userId: 1, mediaId: 4, status: Status.WATCHING, currentSeason: 2, currentEpisode: 0 },
        ]).run();
    }
    for (const mediaType of [MediaType.BOOKS, MediaType.MANGA, MediaType.SERIES, MediaType.ANIME]) {
        const full = await getContinueItems(1, [mediaType]);
        const preview = await getContinueItems(1, [mediaType], { preview: true });
        const active = full.items.filter(item => getMediaDefinition(item.mediaType).continue.getUpdate(item)?.type !== UpdateType.STATUS);
        expect(preview.items.map(item => item.mediaId)).toEqual(active.slice(0, 5).map(item => item.mediaId));
    }
    const combined = await getContinueItems(1, [MediaType.GAMES, MediaType.BOOKS, MediaType.MANGA, MediaType.SERIES, MediaType.ANIME], { preview: true });
    expect(combined.items).toHaveLength(5);
    expect(combined.pagination.totalItems).toBe(1010);
});
