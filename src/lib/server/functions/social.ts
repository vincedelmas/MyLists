import z from "zod";
import {notFound} from "@tanstack/react-router";
import {createServerFn} from "@tanstack/react-start";
import {respondToFollowRequest} from "@/lib/schemas";
import {getContainer} from "@/lib/server/core/container";
import {FormattedError} from "@/lib/utils/error-classes";
import {PrivacyType, SocialNotifType} from "@/lib/utils/enums";
import {requiredAuthMiddleware} from "@/lib/server/middlewares/authentication";


export const postFollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ targetUserId: z.coerce.number().int().positive() }))
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        const notificationService = container.services.notifications;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot follow yourself ;)");
        }

        const targetUser = await userService.getUserById(targetUserId);
        if (!targetUser) throw notFound();

        const isPrivate = targetUser.privacy === PrivacyType.PRIVATE;
        await userService.follow(currentUser.id, targetUserId, isPrivate);

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
    });


export const postUnfollow = createServerFn({ method: "POST" })
    .middleware([requiredAuthMiddleware])
    .validator(z.object({ targetUserId: z.coerce.number().int().positive() }))
    .handler(async ({ data: { targetUserId }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        const notificationService = container.services.notifications;

        if (currentUser.id === targetUserId) {
            throw new FormattedError("You cannot unfollow yourself ;)");
        }

        // Cancel or Unfollowing
        await userService.unfollow(currentUser.id, targetUserId);

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
    .validator(respondToFollowRequest)
    .handler(async ({ data: { followerId, action }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        const notificationService = container.services.notifications;

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        if (action === "accept") {
            await userService.acceptFollowRequest(followerId, currentUser.id);
        }
        else {
            await userService.declineFollowRequest(followerId, currentUser.id);
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
    .validator(z.object({ followerId: z.coerce.number().int().positive() }))
    .handler(async ({ data: { followerId }, context: { currentUser } }) => {
        const container = await getContainer();
        const userService = container.services.user;
        const notificationService = container.services.notifications;

        if (currentUser.id === followerId) {
            throw new FormattedError("You cannot do that ;)");
        }

        await userService.removeFollower(followerId, currentUser.id);
        await notificationService.deleteSocialNotifsBetweenUsers(followerId, currentUser.id, [SocialNotifType.FOLLOW_ACCEPTED]);
        await notificationService.deleteSocialNotifsBetweenUsers(currentUser.id, followerId, [
            SocialNotifType.NEW_FOLLOWER,
            SocialNotifType.FOLLOW_REQUESTED,
        ]);
    });
