import {Database} from "bun:sqlite";
import {describe, expect, it} from "vitest";
import {FormattedError} from "@/lib/utils/error-classes";
import {MAX_QUERY_SQL_LENGTH} from "@/lib/server/core/mcp/config";
import {validateQuerySql} from "@/lib/server/domain/mcp/query-validation";


describe("query SQL validation", () => {
    it.each([
        "SELECT title FROM my_entries WHERE rating > $rating ORDER BY last_updated DESC LIMIT 5",
        "/* header */ SELECT COUNT(*) FROM entries; -- trailing comment",
        "SELECT 'PRAGMA; ATTACH; load_extension()' AS harmless_literal",
        'SELECT e.title FROM "MY_ENTRIES" AS e JOIN [media_people] AS p ON e.media_id = p.media_id',
        "SELECT title FROM `my_entries` WHERE title LIKE 'Star%' COLLATE NOCASE",
        "SELECT CASE WHEN rating BETWEEN 8 AND 10 THEN 'high' ELSE 'other' END FROM entries",
        "SELECT rating FROM entries WHERE rating NOT IN (SELECT rating FROM my_entries)",
        "SELECT media_id FROM entries WHERE media_id IN my_entries",
        "SELECT AVG(rating) FILTER (WHERE rating > 0), COUNT(DISTINCT media_id) FROM my_entries",
        "SELECT GROUP_CONCAT(title ORDER BY rating DESC) FROM my_entries",
        "WITH rated AS (SELECT * FROM my_entries WHERE rating > 8) SELECT COUNT(*) FROM rated",
        'WITH "rated titles" AS (SELECT title FROM my_entries) SELECT * FROM "rated titles"',
        "WITH a AS (SELECT * FROM entries), b AS (SELECT * FROM a) SELECT * FROM b",
        "SELECT * FROM (WITH rated AS (SELECT title FROM my_entries) SELECT * FROM rated)",
        "WITH RECURSIVE numbers(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM numbers WHERE n < 5) SELECT n FROM numbers",
        "SELECT title FROM my_entries UNION ALL SELECT title FROM entries ORDER BY title LIMIT 5",
        "SELECT ROW_NUMBER() OVER (PARTITION BY media_type ORDER BY rating DESC), title FROM entries",
        "SELECT LAG(rating) OVER ratings FROM entries WINDOW ratings AS (PARTITION BY media_type ORDER BY last_updated ROWS BETWEEN 1 PRECEDING AND CURRENT ROW)",
        "SELECT CAST(rating AS INTEGER), COALESCE(comment, ''), STRFTIME('%Y', last_updated) FROM my_entries",
        "SELECT SQRT(POWER(9, 2)), JSON_EXTRACT('{\"rating\":9}', '$.rating'), SQLITE_VERSION()",
        "SELECT main.entries.rating FROM main.entries",
        "SELECT name FROM main.sqlite_schema WHERE type = 'table'",
        "SELECT value FROM json_each('[1,2,3]')",
        "SELECT name FROM pragma_table_info('entries')",
    ])("accepts supported analytics SQL: %s", sql => {
        expect(validateQuerySql(sql)).toBe(sql);
    });

    it.each([
        "",
        "-- only a comment",
        "SELECT FROM my_entries",
        "VALUES (1)",
        "SELECT 1; SELECT 2",
        "SELECT title FROM my_entries; /* hidden */ DELETE FROM my_entries",
        "SELECT 1; -- comment\n ATTACH DATABASE '/tmp/main.db' AS app",
        "SELECT 1\0; ATTACH DATABASE '/tmp/main.db' AS app",
        "SELECT '\0'",
        "ATTACH DATABASE '/tmp/main.db' AS app",
        "DETACH DATABASE main",
        "PRAGMA database_list",
        "UPDATE entries SET rating = 10",
        "INSERT INTO entries(media_id) VALUES(1)",
        "DELETE FROM entries RETURNING *",
        "CREATE TABLE stolen AS SELECT * FROM entries",
        "DROP TABLE entries",
        "VACUUM INTO '/tmp/backup.db'",
        "EXPLAIN SELECT * FROM entries",
        "WITH x AS (SELECT * FROM entries) DELETE FROM entries",
        "SELECT load_extension('/tmp/evil.so')",
        "SELECT load_extension(*)",
        'SELECT "LoAd_ExTeNsIoN"(\'/tmp/evil.so\')',
        "SELECT [load_extension]('/tmp/evil.so')",
        "SELECT `load_extension`('/tmp/evil.so')",
        "SELECT 'load_extension'('/tmp/evil.so')",
        "SELECT readfile('/etc/passwd')",
        "SELECT writefile('/tmp/file', 'contents')",
        "SELECT COALESCE((SELECT load_extension('/tmp/evil.so')), 0)",
        "WITH x AS (SELECT readfile('/etc/passwd')) SELECT * FROM x",
        "SELECT COUNT(*) FILTER (WHERE readfile('/etc/passwd')) FROM entries",
        "SELECT AVG(rating) OVER (ORDER BY readfile('/etc/passwd')) FROM entries",
        "SELECT rating FROM entries ORDER BY readfile('/etc/passwd')",
        "SELECT $1",
        "SELECT ?",
        "SELECT ?1",
        "SELECT :rating",
        "SELECT @rating",
        "SELECT $namespace::rating(value)",
    ])("rejects unsafe or unsupported SQL: %s", sql => {
        expect(() => validateQuerySql(sql)).toThrow(FormattedError);
    });

    it("bounds SQL size before parsing", () => {
        expect(() => validateQuerySql(`SELECT '${"x".repeat(MAX_QUERY_SQL_LENGTH)}'`)).toThrow("characters");
    });

    it("executes joins, aggregates and window functions using SQLite", () => {
        const database = new Database(":memory:");
        try {
            database.run("CREATE TABLE my_entries(media_id INTEGER, title TEXT, rating REAL)");
            database.run("CREATE TABLE media_people(media_id INTEGER, name TEXT)");
            database.run("INSERT INTO my_entries VALUES (1, 'First', 9), (2, 'Second', 8), (3, 'Third', 3)");
            database.run("INSERT INTO media_people VALUES (1, 'Actor A'), (2, 'Actor A'), (3, 'Actor B')");

            const sql = validateQuerySql(`
                WITH actors AS (
                    SELECT p.name, COUNT(*) AS count, AVG(e.rating) AS average_rating
                    FROM my_entries AS e
                    JOIN media_people AS p ON e.media_id = p.media_id
                    WHERE e.rating > $rating
                    GROUP BY p.name
                )
                SELECT name, count, average_rating,
                    DENSE_RANK() OVER (ORDER BY average_rating DESC) AS rank
                FROM actors
            `);
            expect(database.query(sql).all({ $rating: 5 })).toEqual([
                { name: "Actor A", count: 2, average_rating: 8.5, rank: 1 },
            ]);

            expect(database.query(validateQuerySql(`
                SELECT SQRT(POWER(rating, 2)) AS score,
                    JSON_EXTRACT(JSON_OBJECT('title', title), '$.title') AS title
                FROM main.my_entries WHERE media_id = 1
            `)).get()).toEqual({ score: 9, title: "First" });
            expect(database.query(validateQuerySql("SELECT SUM(value) AS total FROM JSON_EACH('[1,2,3]')")).get())
                .toEqual({ total: 6 });
        }
        finally {
            database.close();
        }
    });
});
