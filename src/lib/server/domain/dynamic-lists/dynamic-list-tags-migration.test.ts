import Database from "bun:sqlite";
import {eq} from "drizzle-orm";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {dynamicListSpecSchema} from "@/lib/schemas/dynamic-lists.schema";
import {getDynamicListResults} from "./dynamic-lists.queries";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));


describe("stable dynamic-list tag migration", () => {
    it("preserves tags and real assignments while removing empty-tag placeholders for every media type", () => {
        const sqlite = new Database(":memory:");
        const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
        const index = migrations.findIndex(migration => migration.sql.some(statement =>
            statement.includes('FROM `series_tags` WHERE "media_id" IS NOT NULL'),
        ));
        const db = drizzle(sqlite, { schema, casing: "snake_case" });

        try {
            expect(index).toBeGreaterThan(0);
            sqlite.transaction(() => {
                for (const migration of migrations.slice(0, index)) {
                    for (const statement of migration.sql) sqlite.run(statement);
                }
            })();
            sqlite.run("PRAGMA foreign_keys = ON");
            sqlite.run("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'owner', 'owner@example.invalid', 1, '2026-01-01', '2026-01-01')");
            for (const mediaType of ALL_MEDIA_TYPES) {
                const extraColumns = mediaType === "books" ? ", pages"
                    : mediaType === "movies" ? ", duration"
                    : mediaType === "series" || mediaType === "anime" ? ", duration, total_seasons, total_episodes" : "";
                const extraValues = mediaType === "books" || mediaType === "movies" ? ", 100"
                    : mediaType === "series" || mediaType === "anime" ? ", 24, 1, 12" : "";
                sqlite.run(`INSERT INTO ${mediaType} (id, api_id, name, image_cover${extraColumns}) VALUES (1, 1, 'Title', 'default.jpg'${extraValues})`);
                const [empty, assigned] = db.insert(schema.mediaTags).values([
                    { userId: 1, mediaType, name: "Empty" },
                    { userId: 1, mediaType, name: "Assigned" },
                ]).returning().all();
                sqlite.query(`INSERT INTO ${mediaType}_tags (id, user_id, media_id, tag_id) VALUES (1, 1, NULL, ?), (2, 1, 1, ?), (3, 1, NULL, ?)`)
                    .run(empty.id, assigned.id, assigned.id);
            }
            const tagsBefore = db.select().from(schema.mediaTags).orderBy(schema.mediaTags.id).all();

            sqlite.transaction(() => {
                for (const migration of migrations.slice(index)) {
                    for (const statement of migration.sql) sqlite.run(statement);
                }
            })();

            expect(db.select().from(schema.mediaTags).orderBy(schema.mediaTags.id).all()).toEqual(tagsBefore);
            for (const mediaType of ALL_MEDIA_TYPES) {
                const { tagTable } = getServerMediaDefinition(mediaType).repository.tables;
                const tagId = tagsBefore.find(tag => tag.mediaType === mediaType && tag.name === "Assigned")!.id;
                expect(db.select().from(tagTable).all()).toEqual([{ id: 2, userId: 1, mediaId: 1, tagId }]);
                expect(() => sqlite.query(`INSERT INTO ${mediaType}_tags (user_id, media_id, tag_id) VALUES (1, NULL, ?)`).run(tagId))
                    .toThrow("NOT NULL constraint failed");
                expect(() => db.insert(tagTable).values({ userId: 1, mediaId: 1, tagId }).run())
                    .toThrow();
                expect(sqlite.query(`SELECT name FROM sqlite_schema WHERE type = 'index' AND tbl_name = '${mediaType}_tags' AND name LIKE '%placeholder%'`).all())
                    .toEqual([]);
            }
            expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally {
            sqlite.close();
        }
    });

    it("preserves independent global and scoped tag conditions, pins, and matching across renames", () => {
        const sqlite = new Database(":memory:");
        const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
        const index = migrations.findIndex(migration => migration.sql.some(statement => statement.includes("CREATE TABLE `media_tags`")));
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });

        try {
            expect(index).toBeGreaterThan(0);
            sqlite.transaction(() => {
                for (const migration of migrations.slice(0, index)) {
                    for (const statement of migration.sql) sqlite.run(statement);
                }
            })();
            sqlite.run("PRAGMA foreign_keys = ON");
            sqlite.run("INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'owner', 'owner@example.invalid', 1, '2026-01-01', '2026-01-01')");
            sqlite.run("INSERT INTO user_media_settings (user_id, media_type, active) VALUES (1, 'movies', 1), (1, 'books', 1)");
            for (let id = 1; id <= 3; id++) {
                sqlite.query("INSERT INTO movies (id, api_id, name, image_cover, duration) VALUES (?, ?, ?, 'default.jpg', 100)").run(id, id, `Movie ${id}`);
                sqlite.query("INSERT INTO books (id, api_id, name, image_cover, pages) VALUES (?, ?, ?, 'default.jpg', 100)").run(id, String(id), `Book ${id}`);
                sqlite.query("INSERT INTO movies_list (user_id, media_id, status) VALUES (1, ?, 'Completed')").run(id);
                sqlite.query("INSERT INTO books_list (user_id, media_id, status) VALUES (1, ?, 'Completed')").run(id);
            }
            sqlite.run("INSERT INTO movies_tags (user_id, media_id, name) VALUES (1, 1, 'A'), (1, 1, 'C'), (1, 2, 'B'), (1, 2, 'D'), (1, 3, 'A')");
            sqlite.run("INSERT INTO books_tags (user_id, media_id, name) VALUES (1, 1, 'A'), (1, 1, 'E'), (1, 2, 'B'), (1, 2, 'F'), (1, 3, 'Z'), (1, 3, 'E')");
            const legacy = {
                version: 1, title: "Mixed tags", display: "grid", mediaTypes: ["movies", "books"],
                sort: { field: "title", direction: "asc" },
                filters: { tags: ["A", "B"], mediaFilters: { movies: { tags: ["C", "D"] }, books: { tags: ["E", "F"] } } },
            };
            sqlite.query("INSERT INTO smart_views (id, user_id, spec, profile_position) VALUES (7, 1, ?, 2)").run(JSON.stringify(legacy));
            sqlite.transaction(() => {
                for (const migration of migrations.slice(index)) {
                    for (const statement of migration.sql) sqlite.run(statement);
                }
            })();

            const saved = dbContext.db.select().from(schema.dynamicLists).where(eq(schema.dynamicLists.id, 7)).get()!;
            expect(dynamicListSpecSchema.safeParse(saved.spec).success).toBe(true);
            expect(saved.profilePosition).toBe(2);
            expect(sqlite.query("SELECT COUNT(*) AS total FROM movies_tags").get()).toEqual({ total: 5 });
            expect(sqlite.query("SELECT COUNT(*) AS total FROM books_tags").get()).toEqual({ total: 6 });
            expect(sqlite.query<{ name: string }, []>("PRAGMA table_info(movies_tags)").all().map(column => column.name)).toEqual(["id", "user_id", "media_id", "tag_id"]);
            expect(sqlite.query("SELECT name FROM sqlite_schema WHERE type = 'trigger' AND name LIKE '%tags%'").all()).toEqual([]);
            expect(saved.spec.filters.mediaFilters?.movies?.tagRules).toHaveLength(2);
            expect(saved.spec.filters.mediaFilters?.books?.tagRules).toHaveLength(2);
            const results = () => getDynamicListResults(1, saved.spec).items.map(item => [item.mediaType, item.mediaId]);
            expect(results()).toEqual([["books", 1], ["books", 2], ["movies", 1], ["movies", 2]]);
            sqlite.run("UPDATE media_tags SET name = 'Z' WHERE user_id = 1 AND media_type = 'movies' AND name = 'A'");
            expect(results()).toEqual([["books", 1], ["books", 2], ["movies", 1], ["movies", 2]]);
            expect(sqlite.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally {
            sqlite.close();
        }
    });
});
