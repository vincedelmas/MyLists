import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const flushApiMonitoringTask = defineTask({
    name: "flushApiMonitoring" as const,
    visibility: "admin",
    description: "Flush completed provider API monitoring minute buckets from Redis into SQLite",
    inputSchema: z.object({ olderThanSecs: z.coerce.number().int().min(30).default(90) }),
    handler: async (ctx, input) => {
        const adminService = await getContainer().then((c) => c.admin);

        const cutoffMinuteMs = Math.floor((Date.now() - input.olderThanSecs * 1000) / 60_000) * 60_000;
        const { flushed } = await adminService.flushProviderApiRedisRollups(cutoffMinuteMs);

        ctx.metric("flushedRollups", flushed);
    },
});
