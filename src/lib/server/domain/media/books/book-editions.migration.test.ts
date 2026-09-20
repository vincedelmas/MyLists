import Database from "bun:sqlite";
import {readMigrationFiles} from "drizzle-orm/migrator";
import {describe, expect, it} from "vitest";

describe("Book work/edition migration", () => {
    it("preserves IDs, edition metadata and recorded totals while removing edition fields from works", () => {
        const db = new Database(":memory:");
        const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
        const index = migrations.findIndex(migration => migration.sql.some(statement => statement.includes("CREATE TABLE `book_editions`")));
        try {
            db.exec("PRAGMA foreign_keys=OFF");
            db.transaction(() => { for (const migration of migrations.slice(0, index)) for (const statement of migration.sql) db.exec(statement); })();
            db.exec(`INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (1, 'reader', 'reader@example.com', 1, '2025-01-01', '2025-01-01');
                INSERT INTO books (id, api_id, name, pages, language, publishers, release_date, image_cover)
                    VALUES (17, 'volume-fr', 'Un livre', 320, 'fr', 'Publisher', '2020-06-01', 'book.jpg');
                INSERT INTO books_authors (media_id, name) VALUES (17, 'An Author');
                INSERT INTO books_list (user_id, media_id, status, actual_page, redo, total, rating, comment)
                    VALUES (1, 17, 'Reading', 50, 2, 688, 8.5, 'Keep my note');`);
            db.exec("PRAGMA foreign_keys=ON");
            db.transaction(() => { for (const statement of migrations[index].sql) db.exec(statement); })();
            expect(db.query("SELECT id, api_id, release_date FROM books").get()).toEqual({ id: 17, api_id: "volume-fr", release_date: null });
            expect(db.query("SELECT id, media_id, pages, language, publishers, release_date, authors FROM book_editions").get())
                .toEqual({ id: 17, media_id: 17, pages: 320, language: "fr", publishers: "Publisher", release_date: "2020-06-01", authors: '["An Author"]' });
            expect(db.query("SELECT media_id, edition_id, pages, actual_page, total, redo, reread_pages, rating, comment FROM books_list").get())
                .toEqual({ media_id: 17, edition_id: 17, pages: 320, actual_page: 50, total: 688, redo: 2, reread_pages: "[320,320]", rating: 8.5, comment: "Keep my note" });
            expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
            expect(db.query("PRAGMA table_info(books)").all().map((column: any) => column.name)).not.toContain("pages");

            db.exec(`INSERT INTO book_editions (media_id, api_id, name, image_cover, release_date) VALUES (17, 'older-volume', 'Older edition', 'book.jpg', '1980-01-01');
                INSERT INTO books (id, api_id, name, image_cover, release_date) VALUES (18, 'curated', 'Curated work', 'book.jpg', '1965-01-01');
                INSERT INTO book_editions (media_id, api_id, name, image_cover, release_date) VALUES (18, 'curated', 'Recent reprint', 'book.jpg', '2000-01-01');
                INSERT INTO books (id, api_id, name, image_cover) VALUES (19, 'unknown', 'Undated work', 'book.jpg');
                INSERT INTO which_came_first_media (media_type, media_id, release_date) VALUES ('books', 17, '2020-06-01');`);
            const publicationMigration = migrations.find(migration => migration.sql.some(statement => statement.includes("ADD `release_date_source`")))!;
            db.transaction(() => {for (const statement of publicationMigration.sql) db.exec(statement);})();
            expect(db.query("SELECT id, release_date, release_date_source FROM books ORDER BY id").all()).toEqual([
                {id: 17, release_date: "1980-01-01", release_date_source: "edition"},
                {id: 18, release_date: "1965-01-01", release_date_source: "manual"},
                {id: 19, release_date: null, release_date_source: "edition"},
            ]);
            expect(db.query("SELECT release_date FROM which_came_first_media WHERE media_id = 17").get()).toEqual({release_date: "1980-01-01"});
            expect(db.query("SELECT total, rating, comment FROM books_list").get()).toEqual({total: 688, rating: 8.5, comment: "Keep my note"});
            expect(db.query("PRAGMA foreign_key_check").all()).toEqual([]);
        }
        finally { db.close(); }
    });
});
