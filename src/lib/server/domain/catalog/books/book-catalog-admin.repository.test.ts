import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const {BookCatalogAdminRepository} = await import("./book-catalog-admin.repository");


describe("normalized book catalog administration", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.catalogItem).values({
            id: 100,
            kind: MediaType.BOOKS,
            primaryProvider: "google-books",
            primaryExternalId: "volume-100",
            name: "Book",
            imageCover: "default.jpg",
        });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("atomically replaces only the default cover", async () => {
        const repository = new BookCatalogAdminRepository();
        await expect(repository.replaceDefaultCover(100, "first.jpg")).resolves.toBe(true);
        await expect(repository.replaceDefaultCover(100, "second.jpg")).resolves.toBe(false);
        await expect(repository.replaceDefaultCover(999, "missing.jpg")).resolves.toBe(false);
        await expect(repository.getCoverContributionState(100)).resolves.toEqual({ imageCover: "first.jpg" });
    });
});
