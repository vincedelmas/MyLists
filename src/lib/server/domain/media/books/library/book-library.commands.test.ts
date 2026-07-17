import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, Status, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { BookLibraryRepository } = await import("./book-library.repository");
const { BookLibraryCommands } = await import("./book-library.commands");


describe("book library commands", () => {
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
            name: "book-owner",
            email: "book-owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.catalogItem).values({
            id: 1000,
            kind: MediaType.BOOKS,
            primaryProvider: "google-books",
            primaryExternalId: "volume-777",
            name: "Book",
            imageCover: "book.jpg",
        });
        await db.insert(schema.bookDetails).values({ catalogItemId: 1000, pages: 100, language: "en" });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("keeps page, reread, status, stats, activity and history semantics coherent", async () => {
        const library = new BookLibraryCommands(new BookLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.READING });
        await library.replacePage({ userId: 42, catalogItemId: 1000, currentPage: 80 });
        await library.replaceRereads({ userId: 42, catalogItemId: 1000, rereadCount: 2 });
        const completed = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });

        expect(completed.progress).toEqual({
            status: Status.COMPLETED,
            currentPage: 100,
            rereadCount: 2,
            totalPagesRead: 100,
        });
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({
                kind: MediaType.BOOKS,
                timeSpentMinutes: 170,
                totalEntries: 1,
                totalRedo: 2,
                totalSpecific: 100,
            }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ unitsGained: 300, completed: false, redo: true }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toEqual([
            expect.objectContaining({ updateType: UpdateType.STATUS, payload: { oldValue: null, newValue: Status.READING } }),
            expect.objectContaining({ updateType: UpdateType.PAGE, payload: { oldValue: 0, newValue: 80 } }),
            expect.objectContaining({ updateType: UpdateType.REDO, payload: { oldValue: 0, newValue: 2 } }),
            expect.objectContaining({ updateType: UpdateType.STATUS, payload: { oldValue: Status.READING, newValue: Status.COMPLETED } }),
        ]);

        const planned = await library.changeStatus({ userId: 42, catalogItemId: 1000, status: Status.PLAN_TO_READ });
        expect(planned.progress).toEqual({
            status: Status.PLAN_TO_READ,
            currentPage: 0,
            rereadCount: 0,
            totalPagesRead: 0,
        });
        expect(await db.select().from(schema.libraryStats).where(eq(schema.libraryStats.userId, 42))).toEqual([
            expect.objectContaining({ timeSpentMinutes: 0, totalRedo: 0, totalSpecific: 0 }),
        ]);
    });

    it("imports exact drifted progress and common timestamps without manufacturing events", async () => {
        const library = new BookLibraryCommands(new BookLibraryRepository());
        const imported = await library.importEntry({
            userId: 42,
            catalogItemId: 1000,
            status: Status.COMPLETED,
            currentPage: 414,
            rereadCount: 5,
            totalPagesRead: 2_484,
            rating: 8,
            favorite: true,
            customCover: "imported.jpg",
            addedAt: null,
            updatedAt: "2025-04-03 12:00:00",
        });

        expect(imported).toMatchObject({
            favorite: true,
            customCover: "imported.jpg",
            addedAt: null,
            updatedAt: "2025-04-03 12:00:00",
            progress: {
                status: Status.COMPLETED,
                currentPage: 414,
                rereadCount: 5,
                totalPagesRead: 2_484,
            },
        });
        const repeated = await library.importEntry({
            userId: 42,
            catalogItemId: 1000,
            status: Status.READING,
            currentPage: 1,
            rereadCount: 0,
            totalPagesRead: 1,
        });
        expect(repeated).toEqual(imported);
        expect(await db.select().from(schema.libraryEntry)).toHaveLength(1);
        expect(await db.select().from(schema.libraryStats)).toEqual([
            expect.objectContaining({ timeSpentMinutes: 4_222.8, totalRedo: 5, totalSpecific: 2_484 }),
        ]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([]);
        expect(await db.select().from(schema.libraryChange)).toEqual([]);
    });

    it("backdates book activity and history through the command", async () => {
        const library = new BookLibraryCommands(new BookLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.READING, silent: true });
        await library.replacePage({ userId: 42, catalogItemId: 1000, currentPage: 25, loggedAt: "2025-02-07" });

        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ monthBucket: "2025-02", lastUpdatedAt: "2025-02-07 12:00:00" }),
        ]);
        expect(await db.select().from(schema.libraryChange)).toEqual([
            expect.objectContaining({ occurredAt: "2025-02-07", payload: { oldValue: 0, newValue: 25 } }),
        ]);
    });

    it("retains catalog activity after the mutable list entry is removed", async () => {
        const library = new BookLibraryCommands(new BookLibraryRepository());
        await library.add({ userId: 42, catalogItemId: 1000, status: Status.COMPLETED });
        await library.remove({ userId: 42, catalogItemId: 1000 });

        expect(await db.select().from(schema.libraryEntry)).toEqual([]);
        expect(await db.select().from(schema.bookProgress)).toEqual([]);
        expect(await db.select().from(schema.libraryChange)).toEqual([]);
        expect(await db.select().from(schema.libraryActivity)).toEqual([
            expect.objectContaining({ userId: 42, catalogItemId: 1000, libraryEntryId: null, unitsGained: 100 }),
        ]);
    });
});
