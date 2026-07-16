import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {simpleSearchUsernameSchema} from "@/lib/schemas";
import {authorizationMiddleware, resolveTargetUserMiddleware} from "@/lib/server/middlewares/authorization";


export const getUserProfileHeader = createServerFn({ method: "GET" })
    .middleware([resolveTargetUserMiddleware])
    .handler(async ({ context: { currentUser, targetUser } }) => {
        const container = await getContainer();
        return container.features.profileReader.getPublicHeader(targetUser, currentUser?.id);
    });


export const getUserProfile = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { currentUser, user, libraryAccessScope } }) => {
        const targetUserId = user.id;
        const container = await getContainer();
        const userService = container.services.user;

        if (currentUser && currentUser.id !== targetUserId) {
            await userService.incrementProfileView(targetUserId);
        }

        return container.features.profileReader.getOverview(user, currentUser?.id, libraryAccessScope);
    });


export const getUsersFollows = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user, currentUser, libraryAccessScope } }) => {
        const container = await getContainer();
        return container.features.socialGraphReader.getFollows(libraryAccessScope, user.id, currentUser?.id, 999999);
    });


export const getUsersFollowers = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .handler(async ({ context: { user, currentUser, libraryAccessScope } }) => {
        const container = await getContainer();
        return container.features.socialGraphReader.getFollowers(libraryAccessScope, user.id, currentUser?.id, 999999);
    });


export const getAllUpdatesHistory = createServerFn({ method: "GET" })
    .middleware([authorizationMiddleware])
    .validator(simpleSearchUsernameSchema)
    .handler(async ({ data, context: { user } }) => {
        const userUpdatesService = await getContainer().then((c) => c.services.userUpdates);
        return userUpdatesService.getUserUpdatesPaginated(data, user.id);
    });


export const postUpdateShowOnboarding = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .handler(async ({ context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        await userService.updateShowOnboarding(currentUser.id);
    });
