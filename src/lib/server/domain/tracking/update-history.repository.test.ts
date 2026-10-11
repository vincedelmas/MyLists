import Database from "bun:sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {MediaType, UpdateType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {UpdateHistoryRepository} from "./update-history.repository";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));

describe("update history", () => {
    let sqlite: Database;

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

    const logProgress = (oldValue: unknown, newValue: unknown, options: { timestamp?: string; mediaId?: number; updateType?: UpdateType } = {}) => {
        UpdateHistoryRepository.logUpdate({
            userId: 1,
            mediaType: MediaType.SERIES,
            media: { id: options.mediaId ?? 1, name: "Series" },
            updateType: options.updateType ?? UpdateType.TV,
            timestamp: options.timestamp,
            payload: { old_value: oldValue, new_value: newValue },
        });
    };
    const history = () => UpdateHistoryRepository.getUserMediaHistory(1, MediaType.SERIES, 1);

    it("retains the original episode across eight consecutive updates", () => {
        for (let episode = 4; episode < 12; episode++) logProgress([2, episode], [2, episode + 1]);
        expect(history()).toHaveLength(1);
        expect(history()[0].payload).toEqual({ old_value: [2, 4], new_value: [2, 12] });
    });

    it("starts a new entry outside the grouping window or after a discontinuous change", () => {
        logProgress([2, 4], [2, 5], { timestamp: "2020-01-01 12:00:00" });
        logProgress([2, 5], [2, 6]);
        logProgress([2, 10], [2, 12]);
        expect(history()).toHaveLength(3);
    });

    it("keeps separate backdated edits and removes a correction back to the original position", () => {
        logProgress([2, 4], [2, 5]);
        logProgress([2, 5], [2, 4]);
        expect(history()).toHaveLength(0);
        logProgress([2, 4], [2, 5], { timestamp: "2020-01-01 12:00:00" });
        logProgress([2, 5], [2, 6], { timestamp: "2020-01-01 12:00:00" });
        expect(history()).toHaveLength(2);
    });

});
