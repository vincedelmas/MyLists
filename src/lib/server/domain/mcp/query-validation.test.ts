import {describe, expect, it} from "vitest";
import {FormattedError} from "@/lib/utils/error-classes";
import {validateQuerySql} from "@/lib/server/domain/mcp/sql-query/query-validation";
import {MAX_QUERY_SQL_LENGTH} from "@/lib/server/domain/mcp/sql-query/query.service";


describe("query SQL validation", () => {
    it.each([
        "SELECT title FROM my_entries WHERE rating > $rating ORDER BY last_updated DESC LIMIT 5",
        "SELECT 'PRAGMA; ATTACH; load_extension()' AS harmless_literal",
        "WITH RECURSIVE numbers(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM numbers WHERE n < 5) SELECT n FROM numbers",
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
});
