import {join} from "node:path";
import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import {Status} from "@/lib/utils/enums";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {users} from "../../../../../scripts/e2e/data";
import * as schema from "@/lib/server/database/schema";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";


if (!process.env.MYLISTS_E2E_DIR) {
    throw new Error("Calendar fixtures require the isolated browser test database.");
}


const sqlite = new Database(join(process.env.MYLISTS_E2E_DIR, "site.db"));
const db = drizzle(sqlite, { schema, casing: "snake_case" });
const today = toDateInputValue(new Date(), { timeZone: "utc" });
const monthStart = `${today.slice(0, 7)}-01`;
const previous = shiftDateInputValue(monthStart, { months: -1, days: 14 });
const next = shiftDateInputValue(monthStart, { months: 1, days: 14 });
const userId = users.owner.id;


db.update(schema.userMediaSettings).set({ active: true }).where(eq(schema.userMediaSettings.userId, userId)).run();
db.insert(schema.movies).values([
    { id: 8001, apiId: 8001, name: "Calendar movie", releaseDate: today, duration: 90, imageCover: "default.jpg" },
    { id: 8002, apiId: 8002, name: "Calendar second movie", releaseDate: today, duration: 90, imageCover: "default.jpg" },
    { id: 8003, apiId: 8003, name: "Calendar third movie", releaseDate: today, duration: 90, imageCover: "default.jpg" },
    { id: 8004, apiId: 8004, name: "Past calendar movie", releaseDate: previous, duration: 90, imageCover: "default.jpg" },
    { id: 8005, apiId: 8005, name: "Future calendar movie", releaseDate: next, duration: 90, imageCover: "default.jpg" },
    { id: 8006, apiId: 8006, name: "Undated calendar movie", releaseDate: null, duration: 90, imageCover: "default.jpg" },
    { id: 8007, apiId: 8007, name: "Another user's calendar movie", releaseDate: today, duration: 90, imageCover: "default.jpg" },
    { id: 8008, apiId: 8008, name: "Dropped calendar movie", releaseDate: today, duration: 90, imageCover: "default.jpg" },
]).run();
db.insert(schema.moviesList).values([8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008].map(mediaId => ({
    mediaId, userId: mediaId === 8007 ? users.stranger.id : userId,
    status: mediaId === 8008 ? Status.DROPPED : Status.PLAN_TO_WATCH,
}))).run();

db.insert(schema.games).values([
    { id: 8101, apiId: 8101, name: "Calendar game", releaseDate: today, imageCover: "default.jpg" },
    { id: 8102, apiId: 8102, name: "Past calendar game", releaseDate: previous, imageCover: "default.jpg" },
]).run();
db.insert(schema.gamesList).values([8101, 8102].map(mediaId => ({ mediaId, userId, status: Status.PLAN_TO_PLAY }))).run();

db.insert(schema.series).values([
    {
        id: 8201,
        apiId: 8201,
        name: "Calendar series",
        nextEpisodeToAir: today,
        seasonToAir: 1,
        episodeToAir: 2,
        duration: 30,
        totalSeasons: 1,
        totalEpisodes: 12,
        imageCover: "default.jpg"
    },
    { id: 8202, apiId: 8202, name: "Past episode sentinel", nextEpisodeToAir: previous, duration: 30, totalSeasons: 1, totalEpisodes: 12, imageCover: "default.jpg" },
]).run();
db.insert(schema.seriesList).values([8201, 8202].map(mediaId => ({ mediaId, userId, status: Status.WATCHING, currentSeason: 1, currentEpisode: 1 }))).run();
db.insert(schema.anime).values({
    id: 8301, apiId: 8301, name: "Calendar anime", nextEpisodeToAir: today, seasonToAir: 2, episodeToAir: 3,
    duration: 25, totalSeasons: 2, totalEpisodes: 24, imageCover: "default.jpg",
}).run();
db.insert(schema.animeList).values({ mediaId: 8301, userId, status: Status.WATCHING, currentSeason: 2, currentEpisode: 1 }).run();

sqlite.close();
