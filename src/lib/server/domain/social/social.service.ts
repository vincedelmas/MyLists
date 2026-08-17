import {SocialState} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import {SocialRepository} from "@/lib/server/domain/social/social.repository";


export class SocialService {
    constructor(private repository: typeof SocialRepository) {
    }

    async follow(followerId: number, followedId: number, isPrivate: boolean) {
        const status = isPrivate ? SocialState.REQUESTED : SocialState.ACCEPTED;
        await this.repository.follow(followerId, followedId, status);
        return status;
    }

    async unfollow(followerId: number, followedId: number) {
        await this.repository.unfollow(followerId, followedId);
    }

    async acceptFollowRequest(followerId: number, followedId: number) {
        const result = await this.repository.acceptFollowRequest(followerId, followedId);
        if (result.length === 0) {
            throw new FormattedError("This follow request was canceled.");
        }
    }

    async declineFollowRequest(followerId: number, followedId: number) {
        const result = await this.repository.declineFollowRequest(followerId, followedId);
        if (result.length === 0) {
            throw new FormattedError("This follow request was canceled.");
        }
    }

    async removeFollower(followerId: number, followedId: number) {
        await this.unfollow(followerId, followedId);
    }

    async getFollowingStatus(userId: number, followedId: number) {
        if (userId === followedId) return undefined;
        return this.repository.getFollowingStatus(userId, followedId);
    }

    async getUserFollowers(currentUserId: number | undefined, userId: number, limit = 8) {
        return this.repository.getUserFollowers(currentUserId, userId, limit);
    }

    async getUserFollows(currentUserId: number | undefined, userId: number, limit = 8) {
        return this.repository.getUserFollows(currentUserId, userId, limit);
    }

    async getFollowCount(userId: number) {
        return this.repository.getFollowCount(userId);
    }
}
