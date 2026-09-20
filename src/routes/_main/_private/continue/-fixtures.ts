import {join} from "node:path";
import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {users} from "../../../../../scripts/e2e/data";
import * as schema from "@/lib/server/database/schema";
import {getContainer} from "@/lib/server/core/container";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";


if (!process.env.MYLISTS_E2E_DIR) {
    throw new Error("Continue fixtures require the isolated browser test database.");
}


const sqlite = new Database(join(process.env.MYLISTS_E2E_DIR, "site.db"));
const db = drizzle(sqlite, { schema, casing: "snake_case" });
const userId = users.owner.id;

db.update(schema.userMediaSettings).set({ active: true })
    .where(eq(schema.userMediaSettings.userId, userId)).run();
db.update(schema.userMediaSettings).set({ active: false })
    .where(and(eq(schema.userMediaSettings.userId, userId), eq(schema.userMediaSettings.mediaType, MediaType.ANIME))).run();
db.update(schema.userMediaSettings).set({ active: true })
    .where(and(eq(schema.userMediaSettings.userId, users.follower.id), eq(schema.userMediaSettings.mediaType, MediaType.GAMES))).run();
db.update(schema.userMediaSettings).set({ active: true })
    .where(and(eq(schema.userMediaSettings.userId, users.restricted.id), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();

db.insert(schema.series).values([
    { id: 201, apiId: 201, name: "Continue series", duration: 45, totalSeasons: 2, totalEpisodes: 5, imageCover: "default.jpg" },
    { id: 203, apiId: 203, name: "Older continue series", duration: 45, totalSeasons: 1, totalEpisodes: 5, imageCover: "default.jpg" },
]).onConflictDoNothing().run();
db.insert(schema.seriesEpisodesPerSeason).values([
    { mediaId: 201, season: 1, episodes: 2 },
    { mediaId: 201, season: 3, episodes: 3 },
    { mediaId: 203, season: 1, episodes: 5 },
]).onConflictDoNothing().run();

db.insert(schema.anime).values({
    id: 202, apiId: 202, name: "Disabled anime sentinel", duration: 25,
    totalSeasons: 1, totalEpisodes: 3, imageCover: "default.jpg",
}).onConflictDoNothing().run();
db.insert(schema.animeEpisodesPerSeason).values({ mediaId: 202, season: 1, episodes: 3 }).onConflictDoNothing().run();

db.insert(schema.books).values([
    { id: 301, apiId: "301", name: "Continue book", imageCover: "default.jpg" },
    { id: 302, apiId: "302", name: "Planned book sentinel", imageCover: "default.jpg" },
    { id: 303, apiId: "303", name: "Completed book sentinel", imageCover: "default.jpg" },
    { id: 304, apiId: "304", name: "Dropped book sentinel", imageCover: "default.jpg" },
    { id: 305, apiId: "305", name: "Paused book sentinel", imageCover: "default.jpg" },
    { id: 306, apiId: "306", name: "Another reader sentinel", imageCover: "default.jpg" },
]).onConflictDoNothing().run();

db.insert(schema.bookEditions).values([301, 302, 303, 304, 305, 306].map(id => ({
    id, mediaId: id, apiId: String(id), name: "Book edition", pages: 100, imageCover: "default.jpg",
}))).onConflictDoNothing().run();

db.insert(schema.games).values([
    { id: 401, apiId: 401, name: "Continue game", imageCover: "default.jpg" },
    { id: 402, apiId: 402, name: "Endless game", imageCover: "default.jpg" },
    { id: 403, apiId: 403, name: "Multiplayer game", imageCover: "default.jpg" },
]).onConflictDoNothing().run();
db.insert(schema.manga).values({ id: 501, apiId: 501, name: "Continue manga", chapters: null, imageCover: "default.jpg" })
    .onConflictDoUpdate({ target: schema.manga.id, set: { chapters: null } }).run();

const { services: { mediaTracking } } = await getContainer();
for (const [mediaType, mediaId, status] of [
    [MediaType.SERIES, 201, Status.WATCHING],
    [MediaType.SERIES, 203, Status.WATCHING],
    [MediaType.ANIME, 202, Status.WATCHING],
    [MediaType.BOOKS, 301, Status.READING],
    [MediaType.BOOKS, 302, Status.PLAN_TO_READ],
    [MediaType.BOOKS, 303, Status.COMPLETED],
    [MediaType.BOOKS, 304, Status.DROPPED],
    [MediaType.BOOKS, 305, Status.ON_HOLD],
    [MediaType.GAMES, 401, Status.PLAYING],
    [MediaType.GAMES, 402, Status.ENDLESS],
    [MediaType.GAMES, 403, Status.MULTIPLAYER],
    [MediaType.MANGA, 501, Status.READING],
] as const) {
    mediaTracking.addMediaToList({ userId, mediaType, mediaId, status });
}

mediaTracking.addMediaToList({ userId: users.stranger.id, mediaType: MediaType.BOOKS, mediaId: 306, status: Status.READING });
mediaTracking.addMediaToList({ userId: users.follower.id, mediaType: MediaType.GAMES, mediaId: 401, status: Status.PLAYING });
mediaTracking.updateUserMedia({ userId: users.follower.id, mediaType: MediaType.GAMES, mediaId: 401, payload: { type: UpdateType.PLAYTIME, playtime: 30 } });
mediaTracking.addMediaToList({ userId: users.restricted.id, mediaType: MediaType.BOOKS, mediaId: 301, status: Status.READING });
mediaTracking.updateUserMedia({ userId: users.restricted.id, mediaType: MediaType.BOOKS, mediaId: 301, payload: { type: UpdateType.PAGE, actualPage: 25 } });
mediaTracking.updateUserMedia({ userId, mediaType: MediaType.SERIES, mediaId: 201, payload: { type: UpdateType.TV, currentEpisode: 2 } });
mediaTracking.updateUserMedia({ userId, mediaType: MediaType.BOOKS, mediaId: 301, payload: { type: UpdateType.PAGE, actualPage: 95 } });
mediaTracking.updateUserMedia({ userId, mediaType: MediaType.GAMES, mediaId: 401, payload: { type: UpdateType.PLAYTIME, playtime: 90 } });
mediaTracking.updateUserMedia({ userId, mediaType: MediaType.MANGA, mediaId: 501, payload: { type: UpdateType.CHAPTER, currentChapter: 7 } });

db.update(schema.seriesList).set({ lastUpdated: "2026-01-01 12:00:00" }).where(eq(schema.seriesList.userId, userId)).run();
db.update(schema.seriesList).set({ lastUpdated: "2025-12-01 12:00:00" }).where(eq(schema.seriesList.mediaId, 203)).run();
db.update(schema.booksList).set({ lastUpdated: "2026-01-02 12:00:00" }).where(eq(schema.booksList.userId, userId)).run();
db.update(schema.gamesList).set({ lastUpdated: "2026-01-03 12:00:00" }).where(eq(schema.gamesList.userId, userId)).run();
db.update(schema.mangaList).set({ lastUpdated: "2026-01-04 12:00:00" }).where(eq(schema.mangaList.userId, userId)).run();
db.update(schema.userMediaUpdate).set({ timestamp: "2026-01-01 12:00:00" }).where(eq(schema.userMediaUpdate.userId, userId)).run();

if (process.argv.includes("--finished-progress")) {
    db.update(schema.manga).set({ chapters: 7 }).where(eq(schema.manga.id, 501)).run();
    for (const [mediaType, mediaId, status] of [
        [MediaType.SERIES, 203, Status.WATCHING],
        [MediaType.BOOKS, 301, Status.READING],
        [MediaType.MANGA, 501, Status.READING],
    ] as const) {
        mediaTracking.updateUserMedia({ userId, mediaType, mediaId, payload: { type: UpdateType.STATUS, status: Status.COMPLETED } });
        mediaTracking.updateUserMedia({ userId, mediaType, mediaId, payload: { type: UpdateType.STATUS, status } });
    }
}

if (process.argv.includes("--profile-order")) {
    db.insert(schema.followers).values({ followerId: userId, followedId: users.follower.id, status: "accepted" }).run();
    mediaTracking.addMediaToList({ userId: users.follower.id, mediaType: MediaType.SERIES, mediaId: 201, status: Status.WATCHING });
    db.update(schema.gamesList).set({ lastUpdated: "2026-01-01 12:00:00" }).where(eq(schema.gamesList.userId, users.follower.id)).run();
    db.update(schema.seriesList).set({ lastUpdated: "2026-01-02 12:00:00" }).where(eq(schema.seriesList.userId, users.follower.id)).run();
}

sqlite.close();
