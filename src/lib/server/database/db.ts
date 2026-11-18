import Database from "bun:sqlite";
import {serverEnv} from "@/env/server";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {createServerOnlyFn} from "@tanstack/react-start";


const sqlite = new Database(serverEnv.DATABASE_URL, { create: true });


sqlite.run("PRAGMA busy_timeout = 10000");
sqlite.run("PRAGMA foreign_keys = ON");
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA synchronous = NORMAL");


const getDbConnection = createServerOnlyFn(() => {
    return drizzle({ client: sqlite });
});


export const db = getDbConnection();
