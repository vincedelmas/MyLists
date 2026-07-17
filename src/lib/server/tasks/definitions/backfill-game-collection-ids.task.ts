import {z} from "zod";
import {and, asc, eq} from "drizzle-orm";
import {catalogItem} from "@/lib/server/database/schema";
import {MediaType} from "@/lib/utils/enums";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {getDbClient} from "@/lib/server/database/async-storage";


export const backfillGameCollectionIdsTask = defineTask({
    name: "backfill-game-collection-ids" as const,
    visibility: "admin",
    description: "Backfill IGDB collection IDs for existing games",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const db = getDbClient();
        const container = await getContainer();
        const igdbClient = container.apiClients.igdb;

        const apiIds = await db
            .select({ apiId: catalogItem.primaryExternalId })
            .from(catalogItem)
            .where(and(
                eq(catalogItem.kind, MediaType.GAMES),
                eq(catalogItem.primaryProvider, "igdb"),
            ))
            .orderBy(asc(catalogItem.id))
            .then((rows) => rows
                .map((row) => Number(row.apiId))
                .filter(Number.isSafeInteger));

        ctx.metric("games.total", apiIds.length);

        for (let i = 0; i < apiIds.length; i += 500) {
            const chunk = apiIds.slice(i, i + 500);
            const batchNumber = Math.floor(i / 500) + 1;

            await ctx.step(`batch-${batchNumber}`, async () => {
                const rawCollectionIds = await igdbClient.getGamesCollectionIds(chunk);
                const collectionIdsByApiId = new Map(rawCollectionIds.map((item) => [item.id, item.collections?.[0] ?? null]));

                const updates = chunk.map((apiId) => ({
                    apiId,
                    collectionId: collectionIdsByApiId.get(apiId) ?? null,
                }));

                await container.media.catalog.maintenance.games.synchronizeCollectionExternalIds(updates);

                ctx.increment("games.processed", updates.length);
                ctx.increment("games.with_collection", updates.filter((item) => item.collectionId !== null).length);
                ctx.increment("games.without_collection", updates.filter((item) => item.collectionId === null).length);
            });
        }
    },
});
