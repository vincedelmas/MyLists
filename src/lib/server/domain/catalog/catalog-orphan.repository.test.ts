import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const {CatalogOrphanRepository} = await import("./catalog-orphan.repository");


describe("normalized catalog orphan discovery", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        await db.insert(schema.user).values(user(1));
        await db.insert(schema.catalogItem).values([catalog(101), catalog(102), catalog(103)]);
        await db.insert(schema.libraryEntry).values({
            id: 1, userId: 1, catalogItemId: 101, status: Status.COMPLETED,
        });
        await db.insert(schema.editorialCollection).values({
            id: 1,
            ownerId: 1,
            kind: MediaType.MOVIES,
            title: "Retained collection",
            visibility: PrivacyType.PUBLIC,
        });
        await db.insert(schema.editorialCollectionItem).values({
            collectionId: 1, catalogItemId: 102, position: 1,
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("retains catalog items referenced by either a library or an editorial collection", async () => {
        const repository = new CatalogOrphanRepository();
        await expect(repository.getOrphanedIds(MediaType.MOVIES)).resolves.toEqual([103]);
        await expect(repository.getOrphanedIds(MediaType.BOOKS)).resolves.toEqual([]);
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


const catalog = (id: number) => ({
    id,
    kind: MediaType.MOVIES,
    imageCover: `${id}.jpg`,
    name: `movie-${id}`,
    primaryProvider: "tmdb" as const,
    primaryExternalId: String(id),
});

