import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import {Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {movies, moviesList, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { MoviesRepository } = await import("@/lib/server/domain/media/movies/movies.repository");


describe("BaseRepository.bulkInsertUserMedia", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    let repository: InstanceType<typeof MoviesRepository>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        repository = new MoviesRepository();

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(user).values({
            id: 42,
            emailVerified: true,
            name: "import-user",
            email: "import-user@example.com",
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
        });
        await db.insert(movies).values([
            { id: 100, apiId: 1000, duration: 120, name: "Movie 1", imageCover: "1.jpg" },
            { id: 101, apiId: 1001, duration: 90, name: "Movie 2", imageCover: "2.jpg" },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("bulk-inserts rows and returns only entries newly added to the user list", async () => {
        const rows = [
            {
                redo: 0,
                total: 1,
                userId: 42,
                mediaId: 100,
                status: Status.COMPLETED,
            },
            {
                redo: 0,
                total: 0,
                userId: 42,
                mediaId: 101,
                status: Status.PLAN_TO_WATCH,
            },
        ];

        const inserted = await repository.bulkInsertUserMedia(rows);
        const duplicateInsert = await repository.bulkInsertUserMedia(rows);
        const storedRows = await db.select().from(moviesList).where(eq(moviesList.userId, 42));

        expect(inserted.map(row => row.mediaId)).toEqual([100, 101]);
        expect(duplicateInsert).toEqual([]);
        expect(storedRows).toHaveLength(2);
    });

    it("does not execute an insert for an empty batch", async () => {
        await expect(repository.bulkInsertUserMedia([])).resolves.toEqual([]);
    });
});
