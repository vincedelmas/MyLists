import Database from "bun:sqlite";
import {existsSync} from "node:fs";


const args = process.argv.slice(2);


// Only adopt the baseline for the default migration command, which uses this database path.
if (args.length === 1 && args[0] === "migrate") {
    const { serverEnv } = await import("../src/env/server");
    const path = serverEnv.DATABASE_URL;

    if (existsSync(path)) {
        const sqlite = new Database(path);

        try {
            sqlite.run("PRAGMA busy_timeout = 10000");
            sqlite.transaction(() => {
                const columns = sqlite.query<{ name: string }, []>("PRAGMA table_info(__drizzle_migrations)").all();

                if (columns.length === 0 || columns.some(column => column.name === "name")) {
                    return;
                }

                const latest = sqlite.query<{ hash: string; created_at: number }, []>(
                    "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1"
                ).get();

                if (!latest) return;

                const cutoff = 1794924591240;
                const cutoffHashes = [
                    "61bca9e2b730d153f24a95ad9714efc24b84c05ca6e1790a282a81aa31b39595", // Original migration 0070
                    "e42be9ff26bb5fc7908e612641a1d2f1a860e498b432434af1705980ac4da268", // Drizzle 0.x baseline
                ];

                if (latest.created_at !== cutoff || !cutoffHashes.includes(latest.hash)) {
                    throw new Error("Upgrade this MyLists database through migration 0070 using release v3.21.1 first.");
                }

                sqlite.run("ALTER TABLE __drizzle_migrations ADD COLUMN name TEXT");
                sqlite.run("ALTER TABLE __drizzle_migrations ADD COLUMN applied_at TEXT");
                sqlite.run("UPDATE __drizzle_migrations SET name = ? WHERE created_at = ? AND hash = ?", [
                    "20261117140951_baseline", cutoff, latest.hash,
                ]);
            }).immediate();
        }
        finally {
            sqlite.close();
        }
    }
}


const result = Bun.spawnSync(["bun", "run", "drizzle-kit", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
});


process.exit(result.exitCode);
