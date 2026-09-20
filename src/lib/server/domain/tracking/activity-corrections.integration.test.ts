import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";
import type {UpdateUserMedia} from "@/lib/schemas";
import {allocateActivityCorrection} from "@/lib/utils/media/activity";
import {createBooksRepository, createBooksService} from "@/lib/server/domain/media/books";
import {createGamesRepository, createGamesService, createGamesMonthlyActivity} from "@/lib/server/domain/media/games";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {createMediaMonthlyActivity} from "@/lib/server/domain/media/base/base.monthly-activity";
import {MediaTrackingService} from "./media-tracking.service";
import {ActivityCorrectionRequired, MonthlyActivityService} from "./monthly-activity.service";
import {MonthlyActivityRepository} from "./monthly-activity.repository";
import {UpdateHistoryService} from "./update-history.service";
import {UpdateHistoryRepository} from "./update-history.repository";
import {StatsService} from "@/lib/server/domain/stats/stats.service";
import {StatsRepository} from "@/lib/server/domain/stats/stats.repository";
import {AchievementsRepository} from "@/lib/server/domain/achievements/achievements.repository";
import {NotificationsService} from "@/lib/server/domain/notifications/notifications.service";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";
import type {MediaMonthlyActivityRegistry, MediaServiceRegistry, MediaStatsRegistry} from "@/lib/server/domain/media/media.registries";


const context = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return context.db; } }));


describe("progress corrections", () => {
    let sqlite: Database;
    let tracking: MediaTrackingService;
    const action = { userId: 1, mediaId: 1, mediaType: MediaType.BOOKS };
    const progress = (actualPage: number, loggedAt?: string, activityCorrection?: UpdateUserMedia["activityCorrection"]) =>
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.PAGE, actualPage, loggedAt }, activityCorrection });
    const activities = () => context.db.select().from(schema.userMediaMonthlyActivity).all();
    const snapshot = () => ({
        list: context.db.select().from(schema.booksList).all(),
        stats: context.db.select().from(schema.userMediaSettings).all(),
        activity: activities(),
        history: context.db.select().from(schema.userMediaUpdate).all(),
        statsHistory: context.db.select().from(schema.userMediaStatsHistory).all(),
    });
    const preview = (actualPage: number, choice?: UpdateUserMedia["activityCorrection"], loggedAt?: string) => {
        try { progress(actualPage, loggedAt, choice); }
        catch (error) {
            if (error instanceof ActivityCorrectionRequired) return error.preview;
            throw error;
        }
        throw new Error("Expected a correction preview");
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-18T12:00:00Z"));
        sqlite = new Database(":memory:");
        context.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(context.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        context.db.insert(schema.user).values({ id: 1, name: "reader", email: "reader@example.com", emailVerified: true, createdAt: "2025-01-01", updatedAt: "2025-01-01" }).run();
        context.db.insert(schema.userMediaSettings).values([MediaType.BOOKS, MediaType.GAMES].map(mediaType => ({ userId: 1, mediaType, active: true }))).run();
        context.db.insert(schema.books).values({ id: 1, apiId: "book", name: "Book", imageCover: "book.jpg" }).run();
        context.db.insert(schema.bookEditions).values({ id: 1, mediaId: 1, apiId: "book", name: "Book", pages: 500, imageCover: "book.jpg" }).run();
        context.db.insert(schema.games).values({ id: 1, apiId: 1, name: "Game", imageCover: "game.jpg" }).run();
        const booksRepository = createBooksRepository();
        const gamesRepository = createGamesRepository();
        const services = {
            [MediaType.BOOKS]: createBooksService(booksRepository),
            [MediaType.GAMES]: createGamesService(gamesRepository),
        };
        const monthly = {
            [MediaType.BOOKS]: createMediaMonthlyActivity({ definition: booksServerDefinition, repository: booksRepository }),
            [MediaType.GAMES]: createGamesMonthlyActivity(gamesServerDefinition, gamesRepository),
        };
        const activity = new MonthlyActivityService(MonthlyActivityRepository, { get: type => monthly[type as keyof typeof monthly] } as MediaMonthlyActivityRegistry);
        tracking = new MediaTrackingService(
            new StatsService(StatsRepository, activity, AchievementsRepository, UpdateHistoryRepository, {} as MediaStatsRegistry),
            activity,
            new UpdateHistoryService(UpdateHistoryRepository),
            new NotificationsService(NotificationsRepository),
            { get: type => services[type as keyof typeof services] } as MediaServiceRegistry,
        );
        tracking.addMediaToList({ ...action, status: Status.READING });
    });

    afterEach(() => { sqlite.close(); vi.useRealTimers(); });

    it("changes +120 to +100 and counts subsequent reading once", () => {
        progress(200, "2026-08-20");
        progress(320);
        const corrected = progress(300);
        expect(corrected.userMedia.actualPage).toBe(300);
        expect(activities().map(row => [row.monthBucket, row.progressGained])).toEqual([["2026-08", 200], ["2026-09", 100]]);
        expect(snapshot().stats.find(row => row.mediaType === MediaType.BOOKS)?.totalSpecific).toBe(300);
        progress(320);
        expect(activities().find(row => row.monthBucket === "2026-09")?.progressGained).toBe(120);
    });

    it("previews an older correction without committing changes, then applies the confirmed month", () => {
        progress(120, "2026-08-20");
        const before = snapshot();
        const plan = preview(100);
        expect(snapshot()).toEqual(before);
        expect(allocateActivityCorrection(plan).changes).toMatchObject([{ monthBucket: "2026-08", progressRemoved: 20 }]);
        progress(100, undefined, { version: plan.version });
        expect(activities()).toMatchObject([{ monthBucket: "2026-08", progressGained: 100, lastActivityAt: before.activity[0].lastActivityAt }]);
    });

    it("spreads a larger correction over months without negative totals or empty activity cards", () => {
        progress(120, "2026-08-20");
        progress(130);
        const plan = preview(100);
        expect(allocateActivityCorrection(plan).changes).toMatchObject([
            { monthBucket: "2026-09", progressRemoved: 10 }, { monthBucket: "2026-08", progressRemoved: 20 },
        ]);
        progress(100, undefined, { version: plan.version });
        expect(activities()).toMatchObject([{ monthBucket: "2026-08", progressGained: 100 }]);
        expect(activities()).toHaveLength(1);
    });

    it("lets the user select an older month or preserve already corrected history", () => {
        progress(100, "2026-07-20");
        progress(120, "2026-08-20");
        const plan = preview(110);
        progress(110, undefined, { version: plan.version, startMonth: "2026-07" });
        expect(activities().map(row => row.progressGained)).toEqual([90, 20]);
        const before = activities();
        const next = preview(100);
        const result = progress(100, undefined, { version: next.version, keepHistory: true });
        expect(result.userMedia.actualPage).toBe(100);
        expect(result.activityCorrection?.keptHistory).toBe(true);
        expect(activities()).toEqual(before);
    });

    it("requires a fresh preview after a manual activity edit or concurrent progress change", () => {
        progress(120, "2026-08-20");
        const plan = preview(100);
        MonthlyActivityRepository.updateMonthlyActivity(1, plan.months[0].id, { progressGained: 110 });
        const before = snapshot();
        const fresh = preview(100, { version: plan.version });
        expect(fresh.version).not.toBe(plan.version);
        expect(snapshot()).toEqual(before);
        progress(130, "2026-08-20");
        const changed = snapshot();
        expect(preview(100, { version: fresh.version }).progressRemoved).toBe(30);
        expect(snapshot()).toEqual(changed);
    });

    it.each([0, 5])("reports progress with no matching activity (%s recorded pages)", recorded => {
        progress(120);
        if (recorded === 0) MonthlyActivityRepository.removeFromMonth(1, activities()[0].id);
        else MonthlyActivityRepository.updateMonthlyActivity(1, activities()[0].id, { progressGained: recorded });
        const plan = preview(100);
        expect(allocateActivityCorrection(plan).unrecordedProgress).toBe(20 - recorded);
        progress(100, undefined, { version: plan.version });
        expect(activities()).toEqual([]);
        expect(snapshot().list[0].actualPage).toBe(100);
    });

    it("does not turn a confirmed correction into new activity after another edit reverses the delta", () => {
        progress(120, "2026-08-20");
        const plan = preview(100);
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.STATUS, status: Status.PLAN_TO_READ } });
        const before = snapshot();
        expect(() => progress(100, undefined, { version: plan.version })).toThrow("Your progress changed");
        expect(snapshot()).toEqual(before);
    });

    it("limits a backdated correction to the selected month and earlier history", () => {
        progress(100, "2026-07-20");
        progress(120, "2026-08-20");
        progress(130);
        const plan = preview(110, undefined, "2026-07-25");
        expect(plan.months.map(month => month.monthBucket)).toEqual(["2026-07"]);
        progress(110, "2026-07-25", { version: plan.version });
        expect(activities().map(row => [row.monthBucket, row.progressGained])).toEqual([["2026-07", 80], ["2026-08", 20], ["2026-09", 10]]);
    });

    it("preserves hidden activity and completion flags when correcting its progress", () => {
        progress(120);
        MonthlyActivityRepository.updateMonthlyActivity(1, activities()[0].id, { hidden: true, hadCompletion: true });
        const before = activities()[0];
        progress(0);
        expect(activities()).toEqual([{ ...before, progressGained: 0 }]);
    });

    it("leaves reading history intact for a status reset and corrects explicit reread counts", () => {
        progress(120);
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.REDO, redo: 2 } });
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.REDO, redo: 1 } });
        expect(activities()).toMatchObject([{ progressGained: 620, redoGained: 1 }]);
        const before = activities();
        tracking.updateUserMedia({ ...action, payload: { type: UpdateType.STATUS, status: Status.PLAN_TO_READ } });
        expect(activities()).toEqual(before);
    });

    it("rolls back the correction along with progress when history writing fails", () => {
        progress(120);
        const before = snapshot();
        sqlite.exec("CREATE TRIGGER fail_history BEFORE INSERT ON user_media_update BEGIN SELECT RAISE(ABORT, 'history failure'); END");
        expect(() => progress(100)).toThrow("history failure");
        expect(snapshot()).toEqual(before);
    });

    it("uses minutes for game corrections and keeps other media untouched", () => {
        progress(120);
        const game = { ...action, mediaType: MediaType.GAMES };
        tracking.addMediaToList({ ...game, status: Status.PLAYING });
        tracking.updateUserMedia({ ...game, payload: { type: UpdateType.PLAYTIME, playtime: 120 } });
        tracking.updateUserMedia({ ...game, payload: { type: UpdateType.PLAYTIME, playtime: 100 } });
        expect(activities().map(row => [row.mediaType, row.progressGained])).toEqual([[MediaType.BOOKS, 120], [MediaType.GAMES, 100]]);
        expect(context.db.select().from(schema.gamesList).where(eq(schema.gamesList.userId, 1)).get()?.playtime).toBe(100);
    });
});
