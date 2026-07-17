import {z} from "zod";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {withTransaction} from "@/lib/server/database/async-storage";
import {CatalogOrphanRepository} from "@/lib/server/domain/catalog/catalog-orphan.repository";


export const removeAllOrphansMediaTask = defineTask({
    name: "remove-all-orphans-media" as const,
    visibility: "admin",
    description: "Remove media items not in any user's list and collections",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        const mediaTypes = Object.values(MediaType);
        const notificationCommands = container.notifications.commands;
        const catalogOrphans = new CatalogOrphanRepository();

        for (const mediaType of mediaTypes) {
            await ctx.step(`remove-${mediaType}`, async () => {

                await withTransaction(async (_tx) => {
                    const mediaIdsToRemove = await catalogOrphans.getOrphanedIds(mediaType);
                    ctx.metric(`${mediaType}.removed`, mediaIdsToRemove.length);

                    // Remove in other services
                    await notificationCommands.deleteMediaNotifications(mediaType, mediaIdsToRemove);
                    await container.games.whichCameFirst.deletePoolMedia(mediaType, mediaIdsToRemove);

                    await catalogOrphans.deleteItems(mediaType, mediaIdsToRemove);
                });
            });
        }
    },
});
