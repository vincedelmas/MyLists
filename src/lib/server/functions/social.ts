import {AchievementCategory, PrivacyType} from "@/lib/utils/enums";
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
        const socialService = container.services.social;
        const accountService = container.services.account;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot follow yourself ;)");
        }

        const targetUser = await accountService.getUserById(targetUserId);
        if (!targetUser) throw notFound();

        const status = socialService.follow(currentUser.id, targetUserId, targetUser.privacy === PrivacyType.PRIVATE);
        const unlockedAchievements = container.services.achievements.evaluateUserCategories(currentUser.id, [AchievementCategory.COMMUNITY]);

        return { status, unlockedAchievements };
    });


export const postUnfollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(followUserSchema)
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot unfollow yourself ;)");
        }

        socialService.unfollow(currentUser.id, targetUserId);
    });


export const postRespondToFollowRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(respondToFollowRequestSchema)
    .handler(async ({ data: { followerId, action }, context: { currentUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        if (action === "accept") {
            socialService.acceptFollowRequest(followerId, currentUser.id);
        }
        else {
            socialService.declineFollowRequest(followerId, currentUser.id);
        }
    });


export const postRemoveFollower = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(removeFollowerSchema)
    .handler(async ({ data: { followerId }, context: { currentUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        socialService.removeFollower(followerId, currentUser.id);
    });
