import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {PrivacyType, SocialNotifType} from "@/lib/utils/enums";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";
import {followUserSchema, removeFollowerSchema, respondToFollowRequestSchema} from "@/lib/schemas";


export const postFollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(followUserSchema)
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();
        const accountService = container.services.account;
        const socialService = container.services.social;
        const notificationService = container.services.notifications;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot follow yourself ;)");
        }

        const targetUser = await accountService.getUserById(targetUserId);
        if (!targetUser) throw notFound();

        const isPrivate = targetUser.privacy === PrivacyType.PRIVATE;
        const status = await socialService.follow(currentUser.id, targetUserId, isPrivate);

        await notificationService.deleteSocialNotifsBetweenUsers(currentUser.id, targetUserId, [SocialNotifType.FOLLOW_DECLINED]);
        await notificationService.deleteSocialNotifsBetweenUsers(targetUserId, currentUser.id, [
            SocialNotifType.NEW_FOLLOWER,
            SocialNotifType.FOLLOW_REQUESTED,
        ]);

        await notificationService.createSocialNotification({
            userId: targetUserId,
            actorId: currentUser.id,
            type: isPrivate ? SocialNotifType.FOLLOW_REQUESTED : SocialNotifType.NEW_FOLLOWER,
        });

        return { status };
    });


export const postUnfollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(followUserSchema)
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;
        const notificationService = container.services.notifications;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot unfollow yourself ;)");
        }

        // Cancel or Unfollowing
        await socialService.unfollow(currentUser.id, targetUserId);

        await notificationService.deleteSocialNotifsBetweenUsers(targetUserId, currentUser.id, [
            SocialNotifType.NEW_FOLLOWER,
            SocialNotifType.FOLLOW_REQUESTED,
        ]);

        await notificationService.deleteSocialNotifsBetweenUsers(currentUser.id, targetUserId, [
            SocialNotifType.FOLLOW_ACCEPTED,
            SocialNotifType.FOLLOW_DECLINED,
        ]);
    });


export const postRespondToFollowRequest = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(respondToFollowRequestSchema)
    .handler(async ({ data: { followerId, action }, context: { currentUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;
        const notificationService = container.services.notifications;

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        if (action === "accept") {
            await socialService.acceptFollowRequest(followerId, currentUser.id);
        }
        else {
            await socialService.declineFollowRequest(followerId, currentUser.id);
        }

        await notificationService.deleteSocialNotifsBetweenUsers(currentUser.id, followerId, [SocialNotifType.FOLLOW_REQUESTED]);
        await notificationService.createSocialNotification({
            userId: followerId,
            actorId: currentUser.id,
            type: action === "accept" ? SocialNotifType.FOLLOW_ACCEPTED : SocialNotifType.FOLLOW_DECLINED,
        });
    });


export const postRemoveFollower = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(removeFollowerSchema)
    .handler(async ({ data: { followerId }, context: { currentUser } }) => {
        const container = await getContainer();
        const socialService = container.services.social;
        const notificationService = container.services.notifications;

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        await socialService.removeFollower(followerId, currentUser.id);
        await notificationService.deleteSocialNotifsBetweenUsers(followerId, currentUser.id, [SocialNotifType.FOLLOW_ACCEPTED]);
        await notificationService.deleteSocialNotifsBetweenUsers(currentUser.id, followerId, [
            SocialNotifType.NEW_FOLLOWER,
            SocialNotifType.FOLLOW_REQUESTED,
        ]);
    });
