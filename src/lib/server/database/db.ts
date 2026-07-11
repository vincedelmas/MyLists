import Database from "bun:sqlite";
import * as schema from "./schema";
import {serverEnv} from "@/env/server";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {createServerOnlyFn} from "@tanstack/react-start";


const sqlite = new Database(serverEnv.DATABASE_URL, { create: true });


sqlite.run("PRAGMA foreign_keys = ON");
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA synchronous = NORMAL");
sqlite.run("PRAGMA wal_checkpoint(FULL)");
sqlite.run("PRAGMA busy_timeout = 10000");


const getDbConnection = createServerOnlyFn(() => {
    return drizzle(sqlite, { schema, casing: "snake_case" });
});


export const db = getDbConnection();
