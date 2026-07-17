import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { CatalogCoverReferenceRepository } = await import("./catalog-cover-reference.repository");


describe("normalized cover references", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(schema.user).values(user(1));
        await db.insert(schema.catalogItem).values([
            catalog(101, MediaType.SERIES, "series.jpg"),
            catalog(102, MediaType.MOVIES, "movie.jpg"),
        ]);
        await db.insert(schema.libraryEntry).values([
            entry(1, 101, "https://example.com/static/series-covers/custom.jpg?version=1"),
            entry(2, 102, "movie-custom.jpg"),
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("partitions canonical and custom filenames by media family", async () => {
        const repository = new CatalogCoverReferenceRepository();
        await expect(repository.getReferences(MediaType.SERIES)).resolves.toEqual({
            catalog: ["series.jpg"],
            custom: ["custom.jpg"],
        });
        await expect(repository.getReferences(MediaType.MOVIES)).resolves.toEqual({
            catalog: ["movie.jpg"],
            custom: ["movie-custom.jpg"],
        });
        await expect(repository.getReferences(MediaType.BOOKS)).resolves.toEqual({ catalog: [], custom: [] });
    });
});


const user = (id: number) => ({
    id,
    name: `user-${id}`,
    privacy: PrivacyType.PUBLIC,
    email: `user-${id}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});


const catalog = (id: number, kind: MediaType, imageCover: string) => ({
    id,
    kind,
    imageCover,
    name: `${kind}-${id}`,
    primaryProvider: "tmdb" as const,
    primaryExternalId: String(id),
});


const entry = (id: number, catalogItemId: number, customCover: string) => ({
    id,
    userId: 1,
    catalogItemId,
    customCover,
    status: Status.COMPLETED,
});
