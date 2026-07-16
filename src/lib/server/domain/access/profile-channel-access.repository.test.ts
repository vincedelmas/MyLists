import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const {ProfileChannelAccessRepository} = await import("./profile-channel-access.repository");


describe("profile channel access repository", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 1,
            name: "owner",
            privacy: PrivacyType.PUBLIC,
            email: "owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.profileMediaChannel).values([
            { userId: 1, kind: MediaType.MOVIES, enabled: true },
            { userId: 1, kind: MediaType.SERIES, enabled: false },
            { userId: 1, kind: MediaType.BOOKS, enabled: true },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("treats a missing or disabled row as unpublished and returns enum-stable enabled kinds", async () => {
        const repository = new ProfileChannelAccessRepository();
        await expect(repository.isEnabled(1, MediaType.MOVIES)).resolves.toBe(true);
        await expect(repository.isEnabled(1, MediaType.SERIES)).resolves.toBe(false);
        await expect(repository.isEnabled(1, MediaType.MANGA)).resolves.toBe(false);
        await expect(repository.getEnabledKinds(1)).resolves.toEqual([MediaType.MOVIES, MediaType.BOOKS]);
    });

    it("updates publication and view counters directly in normalized channels", async () => {
        const repository = new ProfileChannelAccessRepository();
        await repository.updateSettings(1, {
            [MediaType.SERIES]: true,
            [MediaType.MANGA]: true,
        });
        await expect(repository.getEnabledKinds(1)).resolves.toEqual([
            MediaType.SERIES,
            MediaType.MOVIES,
            MediaType.BOOKS,
            MediaType.MANGA,
        ]);
        expect(repository.incrementView(1, MediaType.SERIES)).toMatchObject({
            mediaType: MediaType.SERIES,
            active: true,
            views: 1,
        });
    });
});
