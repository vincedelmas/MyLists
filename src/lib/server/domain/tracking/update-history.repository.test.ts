import Database from "bun:sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {UpdateHistoryRepository} from "./update-history.repository";
import {UpdateHistoryService} from "./update-history.service";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));

describe("profile activity replacement after deletion", () => {
    let sqlite: Database;
    const service = new UpdateHistoryService(UpdateHistoryRepository);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values({
            id: 1, name: "activity-user", email: "activity@example.com", emailVerified: true,
            createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }).run();
        db.insert(schema.userMediaSettings).values({ userId: 1, mediaType: MediaType.MOVIES, active: true }).run();
    });

    afterEach(() => sqlite.close());

    it.each([
        { count: 9, remainingIds: [2, 3, 4, 5, 6, 7] },
        { count: 3, remainingIds: [2, 3] },
        { count: 1, remainingIds: [] },
    ])("returns the last remaining profile entry or null from $count activities", async ({ count, remainingIds }) => {
        dbContext.db.insert(schema.userMediaUpdate).values(Array.from({ length: count }, (_, index) => ({
            id: index + 1,
            userId: 1,
            mediaId: index + 1,
            mediaName: `Movie ${index + 1}`,
            mediaType: MediaType.MOVIES,
            updateType: UpdateType.STATUS,
            timestamp: `2026-01-${String(count - index).padStart(2, "0")} 00:00:00`,
        }))).run();

        const replacement = service.deleteUserUpdates(1, [1], true);
        const profileUpdates = await service.getUserUpdates(1);

        expect(profileUpdates.map(update => update.id)).toEqual(remainingIds);
        expect(replacement).toEqual(profileUpdates.at(-1) ?? null);
    });
});
