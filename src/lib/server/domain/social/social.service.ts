import {FormattedError} from "@/lib/utils/error-classes";
import {SocialNotifType, SocialState} from "@/lib/utils/enums";
import {withTransaction} from "@/lib/server/database/async-storage";
import {SocialRepository} from "@/lib/server/domain/social/social.repository";
import {NotificationsRepository} from "@/lib/server/domain/notifications/notifications.repository";


export class SocialService {
    constructor(
        private repository: typeof SocialRepository,
        private notifications: typeof NotificationsRepository,
    ) {
    }

    follow(followerId: number, followedId: number, isPrivate: boolean) {
        return withTransaction(() => {
            const status = isPrivate ? SocialState.REQUESTED : SocialState.ACCEPTED;

            this.repository.follow(followerId, followedId, status);
            this.notifications.deleteSocialNotifsBetweenUsers(followerId, followedId, [SocialNotifType.FOLLOW_DECLINED]);

            this.notifications.deleteSocialNotifsBetweenUsers(followedId, followerId, [
                SocialNotifType.NEW_FOLLOWER, SocialNotifType.FOLLOW_REQUESTED,
            ]);

            this.notifications.createSocialNotification({
                userId: followedId, actorId: followerId,
                type: isPrivate ? SocialNotifType.FOLLOW_REQUESTED : SocialNotifType.NEW_FOLLOWER,
            });

            return status;
        });
    }

    unfollow(followerId: number, followedId: number) {
        return withTransaction(() => {
            this.repository.unfollow(followerId, followedId);

            this.notifications.deleteSocialNotifsBetweenUsers(followedId, followerId, [
                SocialNotifType.NEW_FOLLOWER, SocialNotifType.FOLLOW_REQUESTED,
            ]);

            this.notifications.deleteSocialNotifsBetweenUsers(followerId, followedId, [
                SocialNotifType.FOLLOW_ACCEPTED, SocialNotifType.FOLLOW_DECLINED,
            ]);
        });
    }

    acceptFollowRequest(followerId: number, followedId: number) {
        return withTransaction(() => {
            const result = this.repository.acceptFollowRequest(followerId, followedId);
            if (result.length === 0) throw new FormattedError("This follow request was canceled.");

            this.notifications.deleteSocialNotifsBetweenUsers(followedId, followerId, [SocialNotifType.FOLLOW_REQUESTED]);
            this.notifications.createSocialNotification({ userId: followerId, actorId: followedId, type: SocialNotifType.FOLLOW_ACCEPTED });
        });
    }

    declineFollowRequest(followerId: number, followedId: number) {
        return withTransaction(() => {
            const result = this.repository.declineFollowRequest(followerId, followedId);
            if (result.length === 0) throw new FormattedError("This follow request was canceled.");

            this.notifications.deleteSocialNotifsBetweenUsers(followedId, followerId, [SocialNotifType.FOLLOW_REQUESTED]);
            this.notifications.createSocialNotification({ userId: followerId, actorId: followedId, type: SocialNotifType.FOLLOW_DECLINED });
        });
    }

    removeFollower(followerId: number, followedId: number) {
        return withTransaction(() => {
            this.repository.unfollow(followerId, followedId);

            this.notifications.deleteSocialNotifsBetweenUsers(followerId, followedId, [SocialNotifType.FOLLOW_ACCEPTED]);
            this.notifications.deleteSocialNotifsBetweenUsers(followedId, followerId, [
                SocialNotifType.NEW_FOLLOWER, SocialNotifType.FOLLOW_REQUESTED,
            ]);
        });
    }

    getFollowingStatus(userId: number, followedId: number) {
        if (userId === followedId) return undefined;
        return this.repository.getFollowingStatus(userId, followedId);
    }

    async getUserFollowers(currentUserId: number | undefined, userId: number, limit = 8, offset = 0) {
        return this.repository.getUserFollowers(currentUserId, userId, limit, offset);
    }

    async getUserFollows(currentUserId: number | undefined, userId: number, limit = 8, offset = 0) {
        return this.repository.getUserFollows(currentUserId, userId, limit, offset);
    }

    async getFollowCount(userId: number) {
        return this.repository.getFollowCount(userId);
    }
}
