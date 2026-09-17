import Database from "bun:sqlite";
import {ProfileService} from "./profile.service";
import {ProfileRepository} from "./profile.repository";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createDefaultHighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("profile customization", () => {
    let sqlite: Database;
    const service = new ProfileService(ProfileRepository, {} as MediaServiceRegistry);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `profile-${id}`, email: `profile-${id}@example.com`, emailVerified: true,
            createdAt: "2025-01-01 00:00:00", updatedAt: "2025-01-01 00:00:00",
        }))).run();
    });

    afterEach(() => sqlite.close());

    it("defaults existing profiles to visible and saves the owner's choice alongside highlights", async () => {
        const highlights = createDefaultHighlightedMediaSettings();
        highlights.overview.title = "My favorites";
        ProfileRepository.upsertProfileCustomSetting(1, "highlightedMedia", highlights);
        expect(await service.getContinueVisibility(1)).toBe(true);

        service.saveProfileCustomSettings(1, { ...highlights, showContinue: false });
        expect(await service.getContinueVisibility(1)).toBe(false);
        expect(await service.getContinueVisibility(2)).toBe(true);
        expect(await service.getHighlightedMediaSettings(1)).toEqual(highlights);

        service.saveProfileCustomSettings(1, { ...highlights, showContinue: true });
        expect(await service.getContinueVisibility(1)).toBe(true);
        expect(await service.getHighlightedMediaSettings(1)).toEqual(highlights);
    });

    it("preserves previous customization if either setting cannot be saved", async () => {
        const highlights = createDefaultHighlightedMediaSettings();
        ProfileRepository.upsertProfileCustomSetting(1, "highlightedMedia", highlights);
        sqlite.exec(`CREATE TRIGGER fail_visibility BEFORE INSERT ON profile_custom
            WHEN NEW.key = 'showContinue'
            BEGIN SELECT RAISE(ABORT, 'visibility failure'); END`);

        expect(() => service.saveProfileCustomSettings(1, {
            ...highlights,
            overview: { ...highlights.overview, title: "Unsaved title" },
            showContinue: false,
        })).toThrow();
        expect(await service.getHighlightedMediaSettings(1)).toEqual(highlights);
        expect(await service.getContinueVisibility(1)).toBe(true);
    });
});
