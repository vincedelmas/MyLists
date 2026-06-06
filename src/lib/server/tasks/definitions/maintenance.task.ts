import {z} from "zod";
import {defineTask} from "@/lib/server/tasks/define-task";
import {dbMaintenanceTask} from "@/lib/server/tasks/definitions/db-maintenance.task";
import {flushApiMonitoringTask} from "@/lib/server/tasks/definitions/flush-api-monitoring.task";
import {lockOldMoviesTask} from "@/lib/server/tasks/definitions/lock-old-movies.task";
import {bulkMediaRefreshTask} from "@/lib/server/tasks/definitions/bulk-media-refresh.task";
import {removeAllOrphansMediaTask} from "@/lib/server/tasks/definitions/remove-all-orphans-media";
import {computeAllUsersStatsTask} from "@/lib/server/tasks/definitions/compute-all-users-stats.task";
import {calculateAchievementsTask} from "@/lib/server/tasks/definitions/calculate-achievements.task";
import {addGenresToBooksUsingLlmTask} from "@/lib/server/tasks/definitions/add-books-genres-llm.task";
import {precomputePlatformStatsTask} from "@/lib/server/tasks/definitions/precompute-platform-stats.task";
import {removeUnusedMediaCoversTask} from "@/lib/server/tasks/definitions/remove-unused-media-covers.task";
import {deleteNonActivatedUsersTask} from "@/lib/server/tasks/definitions/delete-non-activated-users.task";
import {createMediaNotificationsTask} from "@/lib/server/tasks/definitions/create-media-notifications.task";
import {removeUnusedProfileImagesTask} from "@/lib/server/tasks/definitions/remove-unused-profile-images.task";


export const maintenanceTask = defineTask({
    name: "maintenance" as const,
    visibility: "admin",
    description: "Run all daily maintenance tasks in sequence",
    inputSchema: z.object({}),
    handler: async (ctx, input) => {
        await ctx.step(deleteNonActivatedUsersTask.name, () => deleteNonActivatedUsersTask.handler(ctx, input));
        await ctx.step(removeAllOrphansMediaTask.name, () => removeAllOrphansMediaTask.handler(ctx, input));
        await ctx.step(removeUnusedMediaCoversTask.name, () => removeUnusedMediaCoversTask.handler(ctx, input));
        await ctx.step(removeUnusedProfileImagesTask.name, () => removeUnusedProfileImagesTask.handler(ctx, input));
        await ctx.step(bulkMediaRefreshTask.name, () => bulkMediaRefreshTask.handler(ctx, input));
        await ctx.step(createMediaNotificationsTask.name, () => createMediaNotificationsTask.handler(ctx, input));
        await ctx.step(lockOldMoviesTask.name, () => lockOldMoviesTask.handler(ctx, input));
        await ctx.step(computeAllUsersStatsTask.name, () => computeAllUsersStatsTask.handler(ctx, input));
        await ctx.step(precomputePlatformStatsTask.name, () => precomputePlatformStatsTask.handler(ctx, input));
        await ctx.step(calculateAchievementsTask.name, () => calculateAchievementsTask.handler(ctx, input));
        await ctx.step(dbMaintenanceTask.name, () => dbMaintenanceTask.handler(ctx, input));
        await ctx.step(addGenresToBooksUsingLlmTask.name, () => addGenresToBooksUsingLlmTask.handler(ctx, input));
        await ctx.step(flushApiMonitoringTask.name, () => flushApiMonitoringTask.handler(ctx, { olderThanSecs: 90 }));
    },
});
