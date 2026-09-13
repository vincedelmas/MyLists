import Database from "bun:sqlite";


if (process.argv.length === 3 && process.argv[2] === "import-drain") {
    // Keep cron's idle path free of app container, ORM and task registry.
    // Help, invalid arguments and other commands still go through Commander.

    try {
        const db = new Database(process.env.DATABASE_URL, { readonly: true });
        let pending;

        try {
            db.run("PRAGMA busy_timeout = 10000");
            pending = db
                .query("SELECT 1 FROM import_jobs WHERE status IN ('queued', 'processing') LIMIT 1")
                .get();
        }
        finally {
            db.close();
        }

        if (!pending) {
            process.exit(0);
        }
    }
    catch (error) {
        console.error("Could not check the import queue:", error);
        process.exit(1);
    }
}


await import("./commands");
