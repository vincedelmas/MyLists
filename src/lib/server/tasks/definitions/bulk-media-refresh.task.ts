import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const bulkMediaRefreshTask = defineTask({
    name: "bulk-media-refresh" as const,
    visibility: "admin",
    description: "Bulk refresh media data from API providers",
    inputSchema: z.object({
        limit: z.coerce.number().positive().optional().describe("Maximum items to process per type"),
        mediaTypes: z.array(z.enum(MediaType)).optional().describe("Media types to refresh (all if omitted)"),
    }),
    handler: async (ctx, input) => {
        const container = await getContainer();
        const registry = container.registries.ingestionServices;

        const mediaTypes = input.mediaTypes;
        const typesToProcess = mediaTypes && mediaTypes.length > 0 ? mediaTypes : Object.values(MediaType);

        for (const mediaType of typesToProcess) {
            await ctx.step(`refresh-${mediaType}`, async () => {
                let errorCount = 0;
                let processedCount = 0;

                const startTime = Date.now();
                const ingestionService = registry.get(mediaType);

                for await (const result of ingestionService.bulkRefresh(input.limit)) {
                    if (result.state === "fulfilled") {
                        ctx.increment(`${mediaType}.success`);
                    }
                    else {
                        errorCount += 1;
                        ctx.increment(`${mediaType}.errors`);
                        ctx.error(`Failed to refresh ${mediaType}`, { apiId: result.apiId, reason: result.reason });
                    }

                    processedCount += 1;
                    if (input.limit && (processedCount >= input.limit)) {
                        ctx.info(`Limit of ${input.limit} reached for ${mediaType}`);
                        break;
                    }
                }

                const durationSecs = (Date.now() - startTime) / 1000;
                const rps = durationSecs > 0 ? processedCount / durationSecs : 0;

                ctx.metric(`${mediaType}.total_processed`, processedCount);
                ctx.metric(`${mediaType}.rps`, rps.toFixed(2));

                if (errorCount > 0) {
                    ctx.warn(`${mediaType} refresh completed with ${errorCount} failures.`);
                }
            });
        }
    },
});
