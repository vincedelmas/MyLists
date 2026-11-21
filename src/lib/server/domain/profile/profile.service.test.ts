import Database from "bun:sqlite";
import {ProfileService} from "./profile.service";
import {MediaType} from "@/lib/utils/enums";
import {setupCacheManager} from "@/lib/server/core/cache-manager";
import {ProfileRepository} from "./profile.repository";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type SQLiteBunDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createDefaultHighlightedMediaSettings} from "@/lib/types/profile-custom.types";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as SQLiteBunDatabase }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));
vi.mock("@/env/server", () => ({ serverEnv: { REDIS_ENABLED: false, CACHE_TTL_MIN: 5 } }));
vi.mock("@/lib/server/core/logger", () => ({ logger: { info: vi.fn() } }));


describe("profile customization", () => {
    let sqlite: Database;
    const service = new ProfileService(ProfileRepository, {} as MediaServiceRegistry);

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle({ client: sqlite });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `profile-${id}`, email: `profile-${id}@example.com`, emailVerified: true,
            createdAt: "2025-01-01 00:00:00", updatedAt: "2025-01-01 00:00:00",
        }))).run();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllTimers();
        vi.useRealTimers();
        sqlite.close();
    });

    it("deduplicates profile views per viewer and target until the five-minute window expires", async () => {
        vi.useFakeTimers();
        const cache = await setupCacheManager();
        await Promise.all(Array.from({ length: 5 }, () => service.incrementProfileView(cache, 3, 1)));
        await service.incrementProfileView(cache, 3, 1);
        expect(dbContext.db.select().from(schema.user).all().map(user => user.profileViews)).toEqual([1, 0]);

        await service.incrementProfileView(cache, 4, 1);
        await service.incrementProfileView(cache, 3, 2);
        expect(dbContext.db.select().from(schema.user).all().map(user => user.profileViews)).toEqual([2, 1]);

        vi.advanceTimersByTime(5 * 60 * 1000);
        await service.incrementProfileView(cache, 3, 1);
        expect(dbContext.db.select().from(schema.user).all().map(user => user.profileViews)).toEqual([3, 1]);
    });

    it("counts media-list views independently by media type, viewer, target, and profile", async () => {
        vi.useFakeTimers();
        const cache = await setupCacheManager();
        dbContext.db.insert(schema.userMediaSettings).values([
            { userId: 1, mediaType: MediaType.BOOKS, active: true },
            { userId: 1, mediaType: MediaType.MOVIES, active: true },
            { userId: 2, mediaType: MediaType.BOOKS, active: true },
        ]).run();

        await service.incrementProfileView(cache, 3, 1);
        await Promise.all(Array.from({ length: 5 }, () => service.incrementMediaTypeView(cache, 3, 1, MediaType.BOOKS)));
        await service.incrementMediaTypeView(cache, 3, 1, MediaType.BOOKS);
        expect(dbContext.db.select().from(schema.userMediaSettings).all().map(settings => settings.views)).toEqual([1, 0, 0]);

        await service.incrementMediaTypeView(cache, 4, 1, MediaType.BOOKS);
        await service.incrementMediaTypeView(cache, 3, 1, MediaType.MOVIES);
        await service.incrementMediaTypeView(cache, 3, 2, MediaType.BOOKS);
        expect(dbContext.db.select().from(schema.userMediaSettings).all().map(settings => settings.views)).toEqual([2, 1, 1]);

        vi.advanceTimersByTime(5 * 60 * 1000);
        await service.incrementMediaTypeView(cache, 3, 1, MediaType.BOOKS);
        expect(dbContext.db.select().from(schema.userMediaSettings).all().map(settings => settings.views)).toEqual([3, 1, 1]);
    });

    it("does not suppress retries after a failed view update", async () => {
        vi.useFakeTimers();
        const cache = await setupCacheManager();
        vi.spyOn(ProfileRepository, "incrementProfileView").mockRejectedValueOnce(new Error("write failed"));

        await expect(service.incrementProfileView(cache, 3, 1)).rejects.toThrow("write failed");
        await service.incrementProfileView(cache, 3, 1);
        expect(dbContext.db.select().from(schema.user).all().map(user => user.profileViews)).toEqual([1, 0]);
    });

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
        sqlite.run(`CREATE TRIGGER fail_visibility BEFORE INSERT ON profile_custom
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
