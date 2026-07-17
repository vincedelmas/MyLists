import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {simpleSearchUsernameSchema} from "@/lib/schemas";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {authorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserProfileHeader = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .handler(async ({ context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        return container.profile.overview.getPublicHeader(targetUser, currentUser?.id);
    });


export const getUserProfile = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { currentUser, user, libraryAccessScope } }) => {
        const container = await getContainer();

        if (currentUser && currentUser.id !== user.id) {
            await container.account.profileViews.recordProfileView(user.id);
        }

        return container.profile.overview.getOverview(user, currentUser?.id, libraryAccessScope);
    });


export const getUsersFollows = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user, currentUser, libraryAccessScope } }) => {
        const container = await getContainer();
        return container.social.query.getFollows(libraryAccessScope, user.id, currentUser?.id, 999999);
    });


export const getUsersFollowers = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user, currentUser, libraryAccessScope } }) => {
        const container = await getContainer();
        return container.social.query.getFollowers(libraryAccessScope, user.id, currentUser?.id, 999999);
    });


export const getAllFeedsHistory = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(simpleSearchUsernameSchema)
    .handler(async ({ data, context: { user } }) => {
        const container = await getContainer();
        return container.profile.updates.query.getUserUpdatesPaginated(data, user.id);
    });


export const postUpdateShowOnboarding = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        await container.account.settings.updateShowOnboarding(currentUser.id);
    });
