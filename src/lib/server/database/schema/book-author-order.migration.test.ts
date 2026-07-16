import fs from "node:fs";
import Database from "bun:sqlite";
import {afterEach, beforeEach, describe, expect, it} from "vitest";


describe("book author order migration", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        sqlite.exec(`
            CREATE TABLE catalog_item (id integer PRIMARY KEY);
            INSERT INTO catalog_item (id) VALUES (10), (20);
            CREATE TABLE book_author (
                id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                catalog_item_id integer NOT NULL,
                name text NOT NULL
            );
            INSERT INTO book_author (id, catalog_item_id, name) VALUES
                (2, 10, 'Primary'),
                (5, 10, 'Secondary'),
                (7, 20, 'Only');
        `);
    });

    afterEach(() => sqlite.close());

    it("derives a stable per-book position from the preserved insertion identity", () => {
        const migration = fs.readFileSync("./drizzle/0054_book_author_order.sql", "utf8")
            .replaceAll("--> statement-breakpoint", "");
        sqlite.exec(migration);

        expect(sqlite.query("SELECT catalog_item_id, name, position FROM book_author ORDER BY catalog_item_id, position").all())
            .toEqual([
                { catalog_item_id: 10, name: "Primary", position: 1 },
                { catalog_item_id: 10, name: "Secondary", position: 2 },
                { catalog_item_id: 20, name: "Only", position: 1 },
            ]);
        expect(() => sqlite.run("INSERT INTO book_author (catalog_item_id, name, position) VALUES (10, 'Duplicate position', 2)"))
            .toThrow(/UNIQUE constraint failed/);
    });
});
