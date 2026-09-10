import Database from "bun:sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {MediadleRepository} from "@/lib/server/domain/mediadle/mediadle.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


describe("MediadleRepository.createDailyMoviedle", () => {
    let sqlite: Database;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-09-10T12:00:00Z"));
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
    });

    afterEach(() => {
        vi.useRealTimers();
        sqlite.close();
    });

    it("excludes the latest 200 films and allows the older film to be selected again", () => {
        dbContext.db.insert(schema.movies).values(Array.from({ length: 201 }, (_, index) => ({
            id: index + 1,
            apiId: index + 1,
            name: `Movie ${index + 1}`,
            duration: 120,
            voteCount: 700,
            imageCover: "default.jpg",
        }))).run();

        const history = Array.from({ length: 201 }, (_, index) => ({
            mediaId: index + 1,
            mediaType: MediaType.MOVIES,
            date: new Date(Date.now() - (201 - index) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        }));
        // Insert out of chronological order so eligibility must follow dates, not row IDs.
        dbContext.db.insert(schema.dailyMediadle).values(history.reverse()).run();

        // Only the oldest film is eligible, making the random selection deterministic.
        expect(MediadleRepository.createDailyMoviedle()).toMatchObject({
            mediaId: 1,
            mediaType: MediaType.MOVIES,
            date: "2026-09-10",
        });
    });
});
