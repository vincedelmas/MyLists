import {FormattedError} from "@/lib/utils/error-classes";
import {withTransaction} from "@/lib/server/database/async-storage";
import {PrivacyType, SocialNotifType, SocialState} from "@/lib/utils/enums";
import {SocialGraphRepository} from "@/lib/server/domain/social/social-graph.repository";
import {NotificationService} from "@/lib/server/domain/notifications/notification.service";


export class SocialGraphCommands {
    constructor(
        private readonly repository = new SocialGraphRepository(),
        private readonly notifications = NotificationService,
    ) {
    }

    async follow(followerId: number, target: { id: number; privacy: PrivacyType }) {
        this.assertDifferentUsers(followerId, target.id, "You cannot follow yourself ;)");

        return withTransaction(async () => {
            const status = target.privacy === PrivacyType.PRIVATE
                ? SocialState.REQUESTED
                : SocialState.ACCEPTED;

            const created = await this.repository.createRelationship(followerId, target.id, status);
            if (!created) {
                return {
                    changed: false,
                    status: (this.repository.getFollowingStatus(followerId, target.id))?.status,
                };
            }

            await this.notifications.deleteSocialNotifsBetweenUsers(followerId, target.id, [SocialNotifType.FOLLOW_DECLINED]);

            await this.notifications.deleteSocialNotifsBetweenUsers(target.id, followerId, [
                SocialNotifType.NEW_FOLLOWER,
                SocialNotifType.FOLLOW_REQUESTED,
            ]);

            await this.notifications.createSocialNotification({
                userId: target.id,
                actorId: followerId,
                type: status === SocialState.REQUESTED ? SocialNotifType.FOLLOW_REQUESTED : SocialNotifType.NEW_FOLLOWER,
            });

            return { changed: true, status };
        });
    }

    async unfollow(followerId: number, followedId: number) {
        this.assertDifferentUsers(followerId, followedId, "You cannot unfollow yourself ;)");

        return withTransaction(async () => {
            const deleted = await this.repository.deleteRelationship(followerId, followedId);

            await this.notifications.deleteSocialNotifsBetweenUsers(followedId, followerId, [
                SocialNotifType.NEW_FOLLOWER,
                SocialNotifType.FOLLOW_REQUESTED,
            ]);

            await this.notifications.deleteSocialNotifsBetweenUsers(followerId, followedId, [
                SocialNotifType.FOLLOW_ACCEPTED,
                SocialNotifType.FOLLOW_DECLINED,
            ]);

            return { changed: Boolean(deleted) };
        });
    }

    async respondToRequest(ownerId: number, followerId: number, action: "accept" | "decline") {
        this.assertDifferentUsers(ownerId, followerId, "You cannot do that ;)");

        return withTransaction(async () => {
            const changed = action === "accept"
                ? await this.repository.acceptRequest(followerId, ownerId)
                : await this.repository.declineRequest(followerId, ownerId);

            if (!changed) throw new FormattedError("This follow request was canceled.");

            await this.notifications.deleteSocialNotifsBetweenUsers(ownerId, followerId, [SocialNotifType.FOLLOW_REQUESTED]);

            await this.notifications.createSocialNotification({
                userId: followerId,
                actorId: ownerId,
                type: action === "accept" ? SocialNotifType.FOLLOW_ACCEPTED : SocialNotifType.FOLLOW_DECLINED,
            });

            return { status: action === "accept" ? SocialState.ACCEPTED : undefined };
        });
    }

    async removeFollower(ownerId: number, followerId: number) {
        this.assertDifferentUsers(ownerId, followerId, "You cannot do that ;)");

        return withTransaction(async () => {
            const deleted = await this.repository.deleteRelationship(followerId, ownerId);
            await this.notifications.deleteSocialNotifsBetweenUsers(followerId, ownerId, [SocialNotifType.FOLLOW_ACCEPTED]);

            await this.notifications.deleteSocialNotifsBetweenUsers(ownerId, followerId, [
                SocialNotifType.NEW_FOLLOWER,
                SocialNotifType.FOLLOW_REQUESTED,
            ]);

            return { changed: Boolean(deleted) };
        });
    }

    private assertDifferentUsers(left: number, right: number, message: string) {
        if (left === right) throw new FormattedError(message);
    }
}
