import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {followUserSchema, removeFollowerSchema, respondToFollowRequestSchema} from "@/lib/schemas";


export const postFollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(followUserSchema)
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot follow yourself ;)");
        }

        const targetUser = await userService.getUserById(targetUserId);
        if (!targetUser) throw notFound();

        await container.features.socialGraphCommands.follow(currentUser.id, targetUser);
    });


export const postUnfollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(followUserSchema)
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot unfollow yourself ;)");
        }

        await container.features.socialGraphCommands.unfollow(currentUser.id, targetUserId);
    });


export const postRespondToFollowRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(respondToFollowRequestSchema)
    .handler(async ({ data: { followerId, action }, context: { currentUser } }) => {
        const container = await getContainer();

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        await container.features.socialGraphCommands.respondToRequest(currentUser.id, followerId, action);
    });


export const postRemoveFollower = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(removeFollowerSchema)
    .handler(async ({ data: { followerId }, context: { currentUser } }) => {
        const container = await getContainer();

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        await container.features.socialGraphCommands.removeFollower(currentUser.id, followerId);
    });
