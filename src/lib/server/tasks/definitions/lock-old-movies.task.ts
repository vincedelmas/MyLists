import {z} from "zod";
import {getContainer} from "@/lib/server/core/container";
import {defineTask} from "@/lib/server/tasks/define-task";


export const lockOldMoviesTask = defineTask({
    name: "lock-old-movies" as const,
    visibility: "admin",
    description: "Lock movies older than 6 months to prevent edits",
    inputSchema: z.object({}),
    handler: async (ctx) => {
        const container = await getContainer();
        await ctx.step("lock-movies", async () => {
            const totalMoviesLocked = await container.media.catalog.maintenance.movies.lockOldMovies();

            ctx.metric("movies.locked", totalMoviesLocked);

            if (totalMoviesLocked > 0) ctx.info(`Successfully locked ${totalMoviesLocked} movies.`);
            else ctx.info("No movies found requiring lock.");
        });
    },
});
