import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const curateWCFTask = defineTask({
    name: "curate-which-came-first" as const,
    visibility: "admin",
    description: "Refresh the popular media pool used by Which Came First",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const whichCameFirstService = container.services.whichCameFirst;
        const counts = await whichCameFirstService.curatePool();

        for (const row of counts) {
            ctx.metric(`${row.mediaType}.active`, row.count);
        }
    },
});
