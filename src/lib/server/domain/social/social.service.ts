import {SocialState} from "@/lib/utils/enums";
import {FormattedError} from "@/lib/utils/error-classes";
import type {SocialRepository} from "@/lib/server/domain/social/social.repository";


export const createSocialService = (repository: SocialRepository) => {
    const service = {
        async follow(followerId: number, followedId: number, isPrivate: boolean) {
            const status = isPrivate ? SocialState.REQUESTED : SocialState.ACCEPTED;
            await repository.follow(followerId, followedId, status);
            return status;
        },

        async unfollow(followerId: number, followedId: number) {
            await repository.unfollow(followerId, followedId);
        },

        async acceptFollowRequest(followerId: number, followedId: number) {
            const result = await repository.acceptFollowRequest(followerId, followedId);
            if (result.length === 0) {
                throw new FormattedError("This follow request was canceled.");
            }
        },

        async declineFollowRequest(followerId: number, followedId: number) {
            const result = await repository.declineFollowRequest(followerId, followedId);
            if (result.length === 0) {
                throw new FormattedError("This follow request was canceled.");
            }
        },

        async removeFollower(followerId: number, followedId: number) {
            await service.unfollow(followerId, followedId);
        },

        async getFollowingStatus(userId: number, followedId: number) {
            if (userId === followedId) return undefined;
            return repository.getFollowingStatus(userId, followedId);
        },

        async getUserFollowers(currentUserId: number | undefined, userId: number, limit = 8) {
            return repository.getUserFollowers(currentUserId, userId, limit);
        },

        async getUserFollows(currentUserId: number | undefined, userId: number, limit = 8) {
            return repository.getUserFollows(currentUserId, userId, limit);
        },

        async getFollowCount(userId: number) {
            return repository.getFollowCount(userId);
        },
    };

    return service;
};


export type SocialService = ReturnType<typeof createSocialService>;
