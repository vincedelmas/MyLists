import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { MangaLibraryRepository } = await import("./manga-library.repository");
const { MangaLibraryCommands } = await import("./manga-library.commands");


describe("manga library commands", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 42,
            name: "manga-owner",
            email: "manga-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.catalogItem).values([
            { id: 1000, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "777", name: "Known", imageCover: "known.jpg" },
            { id: 1001, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "778", name: "Publishing", imageCover: "publishing.jpg" },
        ]);
        await db.insert(schema.mangaDetails).values([
            { catalogItemId: 1000, chapters: 100, productionStatus: "Finished" },
            { catalogItemId: 1001, chapters: null, productionStatus: "Publishing" },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps chapter, reread, status, stats, activity and history semantics coherent", async () => {
        const library = new MangaLibraryCommands(new MangaLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.READING });
        await library.replaceChapter({ userId: 42, catalogItemId: 1000, currentChapter: 80 });
        await library.replaceRereads({ userId: 42, catalogItemId: 1000, rereadCount: 2 });
        const completed = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });

        expect(completed.progress).toEqual({ status: Status.COMPLETED, currentChapter: 100, rereadCount: 2, totalChaptersRead: 100 });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ kind: MediaType.MANGA, timeSpentMinutes: 700, totalEntries: 1, totalRedo: 2, totalSpecific: 100 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 300, completed: false, redo: true }),
        ]);
        expect((await db.select().from(schema.libraryChange)).map(({ updateType }) => updateType)).toEqual([
            UpdateType.STATUS, UpdateType.CHAPTER, UpdateType.REDO, UpdateType.STATUS,
        ]);

        const planned = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.PLAN_TO_READ });
        expect(planned.progress).toEqual({ status: Status.PLAN_TO_READ, currentChapter: 0, rereadCount: 0, totalChaptersRead: 0 });
        expect(await db.select().from(schema.libraryStats).where(eq(schema.libraryStats.userId, 42))).toEqual([
            expect.objectContaining({ timeSpentMinutes: 0, totalRedo: 0, totalSpecific: 0 }),
        ]);
    });

    it("supports open-ended chapter progress and exact imports without manufacturing events", async () => {
        const library = new MangaLibraryCommands(new MangaLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1001, status: Status.READING, silent: true });
        const publishing = await library.replaceChapter({ userId: 42, catalogItemId: 1001, currentChapter: 1_256 });
        expect(publishing.progress.totalChaptersRead).toBe(1_256);
        await expect(library.changeStatus({ userId: 42, catalogItemId: 1001, status: Status.COMPLETED })).rejects.toThrow(/without chapters/);

        await library.remove({ userId: 42, catalogItemId: 1001 });
        const activityBeforeImport = await db.select().from(schema.libraryActivity);
        const historyBeforeImport = await db.select().from(schema.libraryChange);
        const imported = await library.importEntry({
            userId: 42,
            catalogItemId: 1001,
            status: Status.READING,
            currentChapter: 1_256,
            rereadCount: 0,
            totalChaptersRead: 1_256,
            rating: 8,
            favorite: true,
            addedAt: null,
            updatedAt: "2025-04-03 12:00:00",
        });
        expect(imported).toMatchObject({
            addedAt: null,
            updatedAt: "2025-04-03 12:00:00",
            progress: { currentChapter: 1_256, rereadCount: 0, totalChaptersRead: 1_256 },
        });
        const repeated = await library.importEntry({
            userId: 42,
            catalogItemId: 1001,
            status: Status.READING,
            currentChapter: 2,
            rereadCount: 0,
            totalChaptersRead: 2,
        });
        expect(repeated).toEqual(imported);
        expect(await db.select().from(schema.libraryEntry)).toHaveLength(1);
        expect(await db.select().from(schema.libraryActivity)).toEqual(activityBeforeImport);
        expect(await db.select().from(schema.libraryChange)).toEqual(historyBeforeImport);
    });

    it("backdates manga activity and history through the command", async () => {
        const library = new MangaLibraryCommands(new MangaLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.READING, silent: true });
        await library.replaceChapter({ userId: 42, catalogItemId: 1000, currentChapter: 25, loggedAt: "2025-02-07" });

        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ monthBucket: "2025-02", lastUpdatedAt: "2025-02-07 12:00:00" }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toEqual([
            expect.objectContaining({ occurredAt: "2025-02-07", payload: { oldValue: 0, newValue: 25 } }),
        ]);
    });

    it("retains catalog activity after the mutable list entry is removed", async () => {
        const library = new MangaLibraryCommands(new MangaLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        await library.remove({ userId: 42, catalogItemId: 1000 });
        expect(await db.select().from(schema.libraryEntry)).toEqual([]);
        expect(await db.select().from(schema.mangaProgress)).toEqual([]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ userId: 42, catalogItemId: 1000, libraryEntryId: null, unitsGained: 100 }),
        ]);
    });
});
