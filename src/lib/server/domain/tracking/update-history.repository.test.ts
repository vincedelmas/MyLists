import Database from "bun:sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {UpdateHistoryRepository} from "./update-history.repository";
import {UpdateHistoryService} from "./update-history.service";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));

vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));

describe("update history", () => {
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

    it.each([UpdateType.PAGE, UpdateType.CHAPTER, UpdateType.PLAYTIME, UpdateType.REDO])("retains the starting value for repeated %s edits", (updateType) => {
        logProgress(4, 5, { updateType });
        logProgress(5, 12, { updateType });
        expect(history()).toHaveLength(1);
        expect(history()[0].payload).toEqual({ old_value: 4, new_value: 12 });
    });

    it("keeps different titles and status transitions separate", () => {
        logProgress([2, 4], [2, 5]);
        logProgress([1, 1], [1, 2], { mediaId: 2 });
        logProgress(Status.WATCHING, Status.ON_HOLD, { updateType: UpdateType.STATUS });
        logProgress([2, 5], [2, 6]);
        expect(history()).toHaveLength(3);
        expect(history().map(entry => entry.updateType)).toEqual([UpdateType.TV, UpdateType.STATUS, UpdateType.TV]);
        expect(UpdateHistoryRepository.getUserMediaHistory(1, MediaType.SERIES, 2)).toHaveLength(1);
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
