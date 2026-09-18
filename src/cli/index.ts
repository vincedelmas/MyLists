import Database from "bun:sqlite";


if (process.argv.length === 3 && process.argv[2] === "import-drain") {
    // Keep cron's idle path free of app container, ORM and task registry.
    // Help, invalid arguments and other commands still go through Commander.

    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error("DATABASE_URL must be set to the same database used by the web app.");
        }

        const db = new Database(databaseUrl, { readonly: true });
        let pending;

        try {
            db.run("PRAGMA busy_timeout = 10000");
            pending = db
                .query("SELECT 1 FROM import_jobs WHERE status = 'processing' OR (status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now'))) LIMIT 1")
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

    try {
        const { runImportDrainCommand } = await import("./import-drain-command");
        await runImportDrainCommand(process.env.DATABASE_URL!);
        process.exit(0);
    }
    catch (error) {
        console.error("Failed to drain imports:", error);
        process.exit(1);
    }
}


if (process.argv[2] === "activity-repair") {
    // Keep repair audits independent of the application's writable DB and services.
    try {
        const { createActivityRepairCommand } = await import("./activity-repair-command");
        await createActivityRepairCommand().parseAsync(process.argv.slice(3), { from: "user" });
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
else {
    await import("./commands");
}
