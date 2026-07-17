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

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot follow yourself ;)");
        }

        const targetUser = await container.account.query.findById(targetUserId);
        if (!targetUser) throw notFound();

        await container.social.commands.follow(currentUser.id, targetUser);
    });


export const postUnfollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(followUserSchema)
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot unfollow yourself ;)");
        }

        await container.social.commands.unfollow(currentUser.id, targetUserId);
    });


export const postRespondToFollowRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(respondToFollowRequestSchema)
    .handler(async ({ data: { followerId, action }, context: { currentUser } }) => {
        const container = await getContainer();

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        await container.social.commands.respondToRequest(currentUser.id, followerId, action);
    });


export const postRemoveFollower = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(removeFollowerSchema)
    .handler(async ({ data: { followerId }, context: { currentUser } }) => {
        const container = await getContainer();

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        await container.social.commands.removeFollower(currentUser.id, followerId);
    });
