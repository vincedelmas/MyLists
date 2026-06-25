import {z} from "zod";
import {asc, inArray, sql} from "drizzle-orm";
import {games} from "@/lib/server/database/schema";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";
import {getDbClient} from "@/lib/server/database/async-storage";


// TODO: to remove after backfilling
export const backfillGameCollectionIdsTask = defineTask({
    name: "backfill-game-collection-ids" as const,
    visibility: "admin",
    description: "Backfill IGDB collection IDs for existing games",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const db = getDbClient();
        const container = await getContainer();
        const igdbClient = container.clients.igdb;

        const apiIds = await db
            .select({ apiId: games.apiId })
            .from(games)
            .orderBy(asc(games.id))
            .then((rows) => rows.map((row) => row.apiId));

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

                const updateCases = updates.map((item) =>
                    sql`WHEN ${games.apiId} = ${item.apiId} THEN ${item.collectionId}`
                );

                await db
                    .update(games)
                    .set({ collectionId: sql`CASE ${sql.join(updateCases, sql` `)} ELSE ${games.collectionId} END` })
                    .where(inArray(games.apiId, chunk));

                ctx.increment("games.processed", updates.length);
                ctx.increment("games.with_collection", updates.filter((item) => item.collectionId !== null).length);
                ctx.increment("games.without_collection", updates.filter((item) => item.collectionId === null).length);
            });
        }
    },
});
