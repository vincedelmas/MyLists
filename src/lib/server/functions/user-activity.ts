import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {transactionMiddleware} from "@/lib/server/middlewares/transaction";
import {authorizationMiddleware} from "@/lib/server/middlewares/authorization";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {ProfileHighlightsRepository} from "@/lib/server/domain/profile/profile-highlights.repository";
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
    .validator(monthlyActivityStatsSchema)
    .handler(async ({ data, context: { libraryAccessScope } }) => {
        const container = await getContainer();
        return container.activity.getMonthlyActivityStats(data, libraryAccessScope);
    });


export const getMonthlyActivity = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(monthlyActivitySchema)
    .handler(async ({ data, context: { user, libraryAccessScope } }) => {
        const container = await getContainer();
        return container.activity.getMonthlyActivity(user.id, data, libraryAccessScope);
    });


export const getActivityAddMediaSearch = createServerFn({ method: "GET" })
    .middleware([requiredAuthMiddleware])
    .validator(activityAddMediaSearchSchema)
    .handler(async ({ data: { mediaType, query }, context: { currentUser } }) => {
        return ProfileHighlightsRepository.searchUserListByName(currentUser.id, mediaType, query.trim(), 20);
    });


export const postUpdateActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(updateActivitySchema)
    .handler(async ({ data: { activityId, payload }, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.activity);
        return userActivityService.updateActivity(currentUser.id, activityId, payload);
    });


export const postAddActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(addActivitySchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.activity);
        await userActivityService.addActivity(currentUser.id, data);
    });


export const postDeleteActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(deleteActivitySchema)
    .handler(async ({ data: { activityId }, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.activity);
        await userActivityService.deleteActivity(currentUser.id, activityId);
    });


export const postBulkHideActivity = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware, transactionMiddleware])
    .validator(bulkHideActivitySchema)
    .handler(async ({ data, context: { currentUser } }) => {
        const userActivityService = await getContainer().then(c => c.activity);
        return userActivityService.bulkHideActivity(currentUser.id, data);
    });
