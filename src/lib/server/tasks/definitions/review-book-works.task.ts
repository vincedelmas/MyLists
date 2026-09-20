import {z} from "zod";
import {defineTask} from "@/lib/server/tasks/define-task";
import {scanBookWorkCandidates} from "@/lib/server/domain/media/books/book-review.service";

export const reviewBookWorksTask = defineTask({
    name: "review-book-works" as const,
    visibility: "admin",
    description: "Find possible duplicate book works using local metadata only (no API calls)",
    inputSchema: z.object({}),
    handler: async ctx => {
        await ctx.step("scan-local-book-editions", async () => {
            const result = scanBookWorkCandidates();
            for (const [name, value] of Object.entries(result)) ctx.metric(name, value);
            ctx.info(`Found ${result.candidates} possible work pairs for the Books & editions review queue.`);
        });
    },
});
