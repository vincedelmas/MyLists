import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";


export function createQueryTestSource(): Database {
    const source = new Database(":memory:");
    migrate(drizzle(source), { migrationsFolder: "./drizzle" });
    source.exec("PRAGMA foreign_keys = ON");
    return source;
}
