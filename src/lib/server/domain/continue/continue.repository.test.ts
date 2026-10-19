import Database from "bun:sqlite";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {MediaType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {getContinueItem, getContinueItems} from "./continue.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));

let sqlite: Database;
beforeEach(() => {
    sqlite = new Database(":memory:");
    dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
    migrate(dbContext.db, { migrationsFolder: "./drizzle" });
    dbContext.db.insert(schema.user).values({
        id: 1, name: "reader", email: "reader@example.invalid", emailVerified: true,
        createdAt: "2026-01-01", updatedAt: "2026-01-01",
    }).run();
    const media = { id: 1, apiId: 1, imageCover: "default.jpg", duration: 30, totalSeasons: 1, totalEpisodes: 10 };
    dbContext.db.insert(schema.series).values({ ...media, name: "Series" }).run();
    dbContext.db.insert(schema.anime).values({ ...media, name: "Anime" }).run();
    dbContext.db.insert(schema.seriesEpisodesPerSeason).values({ mediaId: 1, season: 1, episodes: 10 }).run();
    dbContext.db.insert(schema.animeEpisodesPerSeason).values({ mediaId: 1, season: 1, episodes: 12 }).run();
    const tracking = { userId: 1, mediaId: 1, currentSeason: 1, currentEpisode: 2, status: Status.WATCHING };
    dbContext.db.insert(schema.seriesList).values({ ...tracking, addedAt: "2026-01-01", lastUpdated: "2026-02-01" }).run();
    dbContext.db.insert(schema.animeList).values({ ...tracking, addedAt: "2026-03-01", lastUpdated: null }).run();
});

afterEach(() => sqlite.close());

it("retains season metadata and sorts by tracking dates after list summaries are trimmed", async () => {
    const items = await getContinueItems(1, [MediaType.SERIES, MediaType.ANIME]);
    expect(items.map(item => item.mediaType)).toEqual([MediaType.ANIME, MediaType.SERIES]);
    expect(items[0]).toMatchObject({
        currentSeason: 1, currentEpisode: 2, addedAt: "2026-03-01", lastUpdated: null,
        epsPerSeason: [{ season: 1, episodes: 12 }],
    });
    expect(getContinueItem(1, MediaType.SERIES, 1)).toMatchObject({
        currentSeason: 1, currentEpisode: 2, lastUpdated: "2026-02-01",
        epsPerSeason: [{ season: 1, episodes: 10 }],
    });
});
