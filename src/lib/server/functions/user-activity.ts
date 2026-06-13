import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {tryFormZodError, tryNotFound} from "@/lib/utils/try-not-found";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {authorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    activityAddMediaSearchSchema,
    addActivitySchema,
    bulkHideActivitySchema,
    deleteActivitySchema,
    monthlyActivitySchema,
    monthlyActivityStatsSchema,
    updateActivitySchema
} from "@/lib/schemas";


export const getMonthlyActivityStats = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(tryNotFound(monthlyActivityStatsSchema))
    .handler(async ({ data, context: { user } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.getMonthlyActivityStats(user.id, data);
    });


export const getMonthlyActivity = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(tryNotFound(monthlyActivitySchema))
    .handler(async ({ data, context: { user } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.getMonthlyActivity(user.id, data);
    });


export const getActivityAddMediaSearch = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(tryNotFound(activityAddMediaSearchSchema))
    .handler(async ({ data: { mediaType, query }, context: { currentUser } }) => {
        const mediaService = await getContainer().then(c => c.registries.mediaService.getService(mediaType));
        return mediaService.searchUserListByName(currentUser.id, query.trim(), 20);
    });


export const postUpdateActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(tryFormZodError(updateActivitySchema))
    .handler(async ({ data: { activityId, payload }, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.updateActivity(currentUser.id, activityId, payload);
    });


export const postAddActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(tryFormZodError(addActivitySchema))
    .handler(async ({ data, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        await userActivityService.addActivity(currentUser.id, data);
    });


export const postDeleteActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(deleteActivitySchema)
    .handler(async ({ data: { activityId }, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        await userActivityService.deleteActivity(currentUser.id, activityId);
    });


export const postBulkHideActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(tryFormZodError(bulkHideActivitySchema))
    .handler(async ({ data, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.bulkHideActivity(currentUser.id, data);
    });
