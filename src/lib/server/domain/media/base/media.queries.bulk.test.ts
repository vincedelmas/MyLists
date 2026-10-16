import {MediaType} from "@/lib/utils/enums";
import {seedMediaTags} from "@/lib/server/domain/media/tag-test-utils";
import {eq} from "drizzle-orm";
import Database from "bun:sqlite";
import {Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {movies, moviesList, user} from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


const { createMoviesRepository } = await import("@/lib/server/domain/media/movies/movies.repository");
const { createMoviesService } = await import("@/lib/server/domain/media/movies/movies.service");


describe("Shared media persistence and list queries", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;
    let repository: ReturnType<typeof createMoviesRepository>;
    let service: ReturnType<typeof createMoviesService>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        repository = createMoviesRepository();
        service = createMoviesService(repository);

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
            { id: 100, apiId: 1000, duration: 120, name: "Movie 1", originalName: "Original One", imageCover: "1.jpg" },
            { id: 101, apiId: 1001, duration: 90, name: "Movie 2", originalName: "Original Two", imageCover: "2.jpg" },
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

    it("rolls back earlier insert batches if a later batch fails", async () => {
        const media = Array.from({ length: 201 }, (_,index) => ({
            id: 1000 + index, apiId: 10000 + index, name: `Batch movie ${index}`, imageCover: "movie.jpg", duration: 120,
        }));
        db.insert(movies).values(media).run();
        sqlite.run(`CREATE TRIGGER fail_later_batch BEFORE INSERT ON movies_list
            WHEN NEW.media_id = 1200 BEGIN SELECT RAISE(ABORT, 'later batch failed'); END`);

        await expect(repository.bulkInsertUserMedia(media.map(({ id }) => ({
            userId: 42, mediaId: id, status: Status.COMPLETED,
        })))).rejects.toThrow();

        expect(db.select().from(moviesList).all()).toEqual([]);
    });

    it("searches a user list by both localized and original media names", async () => {
        await db.insert(moviesList).values([
            { userId: 42, mediaId: 100, status: Status.COMPLETED },
            { userId: 42, mediaId: 101, status: Status.COMPLETED },
        ]);

        const localizedNameResult = await service.getMediaList(undefined, 42, { search: "Movie 1" });
        const originalNameResult = await service.getMediaList(undefined, 42, { search: "Original Two" });

        expect(localizedNameResult.items.map(item => item.mediaId)).toEqual([100]);
        expect(originalNameResult.items.map(item => item.mediaId)).toEqual([101]);
    });

it("scopes tag filters to the owner of the requested list", async () => {
        await db.insert(user).values({
            id: 43,
            emailVerified: true,
            name: "other-user",
            email: "other-user@example.com",
            createdAt: "2024-01-01 00:00:00",
            updatedAt: "2024-01-01 00:00:00",
        });
        await db.insert(moviesList).values([
            { userId: 42, mediaId: 100, status: Status.COMPLETED },
            { userId: 42, mediaId: 101, status: Status.COMPLETED },
        ]);
        seedMediaTags(db, MediaType.MOVIES, [
            { userId: 43, mediaId: 100, name: "private-tag" },
            { userId: 42, mediaId: 101, name: "private-tag" },
        ]);

        const result = await service.getMediaList(undefined, 42, { tags: ["private-tag"] });

        expect(result.items.map((item) => item.mediaId)).toEqual([101]);
    });

});
