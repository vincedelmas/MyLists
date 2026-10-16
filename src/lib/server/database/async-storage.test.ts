import Database from "bun:sqlite";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {eq} from "drizzle-orm";
import {integer, sqliteTable} from "drizzle-orm/sqlite-core";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


import {getDbClient, withTransaction} from "@/lib/server/database/async-storage";


const entries = sqliteTable("entries", { id: integer().primaryKey() });


describe("withTransaction with Bun SQLite", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        sqlite.run("CREATE TABLE entries (id INTEGER PRIMARY KEY)");
        dbContext.db = drizzle(sqlite);
    });

    afterEach(() => sqlite.close());

    it("commits synchronous writes and returns the callback result", () => {
        const result = withTransaction(() => {
            getDbClient().insert(entries).values({ id: 1 }).run();
            getDbClient().insert(entries).values({ id: 2 }).run();
            return 42;
        });

        expect(result).toBe(42);
        expect(dbContext.db.select().from(entries).all()).toHaveLength(2);
        expect(getDbClient()).toBe(dbContext.db);
    });

    it("rolls back all writes and restores the client when an operation throws", () => {
        const failure = new Error("Activity write failed");
        expect(() => withTransaction(() => {
            getDbClient().insert(entries).values({ id: 1 }).run();
            getDbClient().insert(entries).values({ id: 2 }).run();
            throw failure;
        })).toThrow(failure);

        expect(dbContext.db.select().from(entries).all()).toEqual([]);
        expect(getDbClient()).toBe(dbContext.db);
        withTransaction(() => getDbClient().insert(entries).values({ id: 3 }).run());
        expect(dbContext.db.select().from(entries).all()).toEqual([{ id: 3 }]);
    });

    it("reuses the active transaction across nested operations and rolls them back together", () => {
        expect(() => withTransaction((outer) => {
            getDbClient().insert(entries).values({ id: 1 }).run();
            withTransaction((inner) => {
                expect(inner).toBe(outer);
                expect(getDbClient()).toBe(outer);
                getDbClient().insert(entries).values({ id: 2 }).run();
            });
            throw new Error("Outer operation failed");
        })).toThrow("Outer operation failed");

        expect(dbContext.db.select().from(entries).all()).toEqual([]);
    });

    it("rolls back earlier writes on a SQLite constraint error", () => {
        expect(() => withTransaction(() => {
            getDbClient().insert(entries).values({ id: 1 }).run();
            withTransaction(() => getDbClient().insert(entries).values({ id: 1 }).run());
        })).toThrow();

        expect(dbContext.db.select().from(entries).all()).toEqual([]);
    });

    it("rejects async callbacks before they execute", () => {
        let called = false;
        expect(() => {
            // @ts-expect-error Async callbacks must also be rejected by the public type.
            withTransaction(async () => { called = true; });
        }).toThrow("Transaction callbacks must be synchronous");
        expect(called).toBe(false);
    });

    it("reserves the writer before reading while WAL readers remain available", () => {
        const directory = mkdtempSync(join(tmpdir(), "mylists-transaction-"));
        const filename = join(directory, "database.sqlite");
        sqlite.close();
        sqlite = new Database(filename);
        sqlite.run("PRAGMA journal_mode = WAL; CREATE TABLE entries (id INTEGER PRIMARY KEY)");
        dbContext.db = drizzle(sqlite);
        const other = new Database(filename);
        other.run("PRAGMA busy_timeout = 0");

        try {
            withTransaction(() => {
                // Even before our first read, another connection cannot take the writer slot.
                expect(() => other.run("BEGIN IMMEDIATE")).toThrow("database is locked");
                getDbClient().insert(entries).values({ id: 1 }).run();
                expect(other.query("SELECT * FROM entries").all()).toEqual([]);
            });

            other.run("INSERT INTO entries VALUES (2)");
            expect(other.query("SELECT * FROM entries ORDER BY id").all()).toEqual([{ id: 1 }, { id: 2 }]);
        }
        finally {
            other.close();
            sqlite.close();
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it("rejects an unexecuted Drizzle query and rolls back preceding writes", () => {
        expect(() => {
            // @ts-expect-error Lazy Drizzle queries are thenable and must be executed in the callback.
            withTransaction(() => {
                getDbClient().insert(entries).values({ id: 1 }).run();
                return getDbClient().delete(entries).where(eq(entries.id, 1));
            });
        }).toThrow("execute Drizzle queries");

        expect(dbContext.db.select().from(entries).all()).toEqual([]);
    });
});
