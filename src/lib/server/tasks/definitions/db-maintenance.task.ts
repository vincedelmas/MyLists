import {z} from "zod";
import {defineTask} from "@/lib/server/tasks/define-task";
import {getDbClient} from "@/lib/server/database/async-storage";


export const dbMaintenanceTask = defineTask({
    name: "db-maintenance" as const,
    visibility: "admin",
    description: "WAL checkpoint, Vacuum, and Analyze on the db",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const db = getDbClient();

        await ctx.step("run-pragmas", async () => {
            db.run("PRAGMA foreign_keys = ON");
            db.run("PRAGMA synchronous = NORMAL");
            db.run("PRAGMA wal_checkpoint(FULL)");
            db.run("PRAGMA busy_timeout = 10000");
        });

        await ctx.step("vacuum", async () => {
            db.run("VACUUM");
        });

        await ctx.step("analyze", async () => {
            db.run("ANALYZE");
        });

        await ctx.step("collect-settings", async () => {
            const pragmas = ["foreign_keys", "journal_mode", "synchronous", "wal_autocheckpoint", "locking_mode", "busy_timeout"];
            for (const name of pragmas) {
                const result = await db.get(`PRAGMA ${name};`);
                ctx.metric(`sqlite.${name}`, result ? Object.values(result)[0] : "unknown");
            }
        });
    },
});
