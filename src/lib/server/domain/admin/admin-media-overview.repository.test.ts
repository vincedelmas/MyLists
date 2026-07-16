import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const {AdminMediaOverviewRepository} = await import("./admin-media-overview.repository");


describe("normalized admin media overview", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(schema.user).values([user(1, "one"), user(2, "two")]);
        await db.insert(schema.catalogItem).values([
            catalog(101, MediaType.SERIES),
            catalog(102, MediaType.SERIES),
            catalog(103, MediaType.MOVIES),
        ]);

        const currentMonth = monthDate(0);
        const previousMonth = monthDate(-1);
        await db.insert(schema.libraryEntry).values([
            entry(1, 1, 101, currentMonth, currentMonth),
            entry(2, 2, 101, currentMonth, currentMonth),
            entry(3, 1, 102, previousMonth, previousMonth),
            entry(4, 1, 103, currentMonth, currentMonth),
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("counts added entries but distinct updated catalog items per family", async () => {
        await expect(AdminMediaOverviewRepository.getUserMediaAddedAndUpdated(MediaType.SERIES))
            .resolves.toEqual({
                added: { thisMonth: 2, lastMonth: 1, comparedToLastMonth: 1 },
                updated: { thisMonth: 1 },
            });
        await expect(AdminMediaOverviewRepository.getUserMediaAddedAndUpdated(MediaType.MOVIES))
            .resolves.toEqual({
                added: { thisMonth: 1, lastMonth: 0, comparedToLastMonth: 1 },
                updated: { thisMonth: 1 },
            });
        await expect(AdminMediaOverviewRepository.getUserMediaAddedAndUpdated(MediaType.BOOKS))
            .resolves.toEqual({
                added: { thisMonth: 0, lastMonth: 0, comparedToLastMonth: 0 },
                updated: { thisMonth: 0 },
            });
    });
});


const monthDate = (monthOffset: number) => {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() + monthOffset, 15);
    date.setUTCHours(12, 0, 0, 0);
    return date.toISOString().slice(0, 19).replace("T", " ");
};


const user = (id: number, name: string) => ({
    id,
    name,
    privacy: PrivacyType.PUBLIC,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});


const catalog = (id: number, kind: MediaType) => ({
    id,
    kind,
    name: `${kind}-${id}`,
    imageCover: `${id}.jpg`,
    primaryProvider: kind === MediaType.BOOKS ? "google-books" as const : "tmdb" as const,
    primaryExternalId: String(id),
});


const entry = (id: number, userId: number, catalogItemId: number, addedAt: string, updatedAt: string) => ({
    id,
    userId,
    catalogItemId,
    addedAt,
    updatedAt,
    status: Status.COMPLETED,
});
