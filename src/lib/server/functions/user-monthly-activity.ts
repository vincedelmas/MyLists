import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {authorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {
    addMonthlyActivitySchema,
    bulkHideActivitySchema,
    monthlyActivityMediaSearchSchema,
    monthlyActivitySchema,
    monthlyActivityStatsSchema,
    removeMonthlyActivitySchema,
    updateMonthlyActivitySchema,
} from "@/lib/schemas";


export const getMonthlyActivityStats = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(monthlyActivityStatsSchema)
    .handler(async ({ data, context: { user } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.getMonthlyActivityStats(user.id, data);
    });


export const getMonthlyActivity = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(monthlyActivitySchema)
    .handler(async ({ data, context: { user } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.getMonthlyActivity(user.id, data);
    });


export const getMonthlyActivityMediaSearch = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(monthlyActivityMediaSearchSchema)
    .handler(async ({ data: { mediaType, query }, context: { currentUser } }) => {
        const monthlyActivity = await getContainer().then(c => c.registries.mediaMonthlyActivity.get(mediaType));
        return monthlyActivity.searchUserMedia(currentUser.id, query.trim(), 20);
    });


export const postUpdateMonthlyActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateMonthlyActivitySchema)
    .handler(async ({ data: { activityId, payload }, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.updateMonthlyActivity(currentUser.id, activityId, payload);
    });


export const postAddMonthlyActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addMonthlyActivitySchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        await userActivityService.addMonthlyActivity(currentUser.id, data);
    });


export const postRemoveMonthlyActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(removeMonthlyActivitySchema)
    .handler(async ({ data: { activityId }, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        await userActivityService.removeFromMonth(currentUser.id, activityId);
    });


export const postBulkHideActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(bulkHideActivitySchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.services.userActivity);
        return userActivityService.bulkHideMonthlyActivity(currentUser.id, data);
    });
