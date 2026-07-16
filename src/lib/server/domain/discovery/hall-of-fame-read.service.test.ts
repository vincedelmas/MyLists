import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { HallOfFameReadService } = await import("./hall-of-fame-read.service");


describe("normalized Hall of Fame", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([
            user(1, "alpha", PrivacyType.PUBLIC),
            user(2, "beta", PrivacyType.PRIVATE),
            user(3, "gamma", PrivacyType.RESTRICTED),
            user(4, "DemoProfile", PrivacyType.PUBLIC),
        ]);

        const times: Record<number, Partial<Record<MediaType, number>>> = {
            1: { series: 100, movies: 50 },
            2: { series: 200 },
            3: { movies: 100 },
            4: { series: 1000, movies: 1000 },
        };
        const enabled: Record<number, MediaType[]> = {
            1: [MediaType.SERIES, MediaType.MOVIES],
            2: [MediaType.SERIES],
            3: [MediaType.MOVIES],
            4: [MediaType.SERIES, MediaType.MOVIES],
        };
        await db.insert(schema.profileMediaChannel).values(Object.keys(times).flatMap((id) =>
            Object.values(MediaType).map((kind) => ({
                userId: Number(id),
                kind,
                enabled: enabled[Number(id)].includes(kind),
            })),
        ));
        await db.insert(schema.libraryStats).values(Object.keys(times).flatMap((id) =>
            Object.values(MediaType).map((kind) => ({
                userId: Number(id),
                kind,
                timeSpentMinutes: times[Number(id)][kind] ?? 0,
            })),
        ));
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("ranks enabled channel time while keeping private identities and disabled channels in the public cards", async () => {
        const result = await new HallOfFameReadService().getHallOfFame({ sorting: "profile" }, 1);

        expect(result).toMatchObject({
            page: 1,
            pages: 1,
            total: 3,
            items: [
                { id: 2, name: "beta", privacy: PrivacyType.PRIVATE, totalTime: 200, rank: 1 },
                { id: 1, name: "alpha", privacy: PrivacyType.PUBLIC, totalTime: 150, rank: 2 },
                { id: 3, name: "gamma", privacy: PrivacyType.RESTRICTED, totalTime: 100, rank: 3 },
            ],
        });
        expect(result.items.some(({ name }) => name === "DemoProfile")).toBe(false);
        expect(result.items[1].settings).toHaveLength(6);
        expect(result.items[1].settings).toEqual(expect.arrayContaining([
            { mediaType: MediaType.SERIES, active: true, timeSpent: 100 },
            { mediaType: MediaType.MOVIES, active: true, timeSpent: 50 },
            { mediaType: MediaType.MANGA, active: false, timeSpent: 0 },
        ]));
        expect(result.userRanks).toEqual(expect.arrayContaining([
            { mediaType: MediaType.SERIES, active: true, rank: 2, percent: (2 / 3) * 100 },
            { mediaType: MediaType.MOVIES, active: true, rank: 2, percent: (2 / 3) * 100 },
            expect.objectContaining({ mediaType: MediaType.BOOKS, active: false, percent: null }),
        ]));
    });

    it("applies filtering and pagination after global ranks are calculated", async () => {
        await expect(new HallOfFameReadService().getHallOfFame({
            sorting: MediaType.SERIES,
            search: "amm",
            page: 1,
            perPage: 1,
        })).resolves.toMatchObject({
            page: 1,
            pages: 1,
            total: 1,
            items: [{ id: 3, name: "gamma", rank: 3 }],
        });
    });
});


const user = (id: number, name: string, privacy: PrivacyType) => ({
    id,
    name,
    privacy,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
