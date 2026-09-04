import {SimpleSearch} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {Actor} from "@/lib/server/authorization";
import {LogUpdateParams} from "@/lib/types/user-updates.types";
import type {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";


export const createUpdateHistoryService = (repository: UpdateHistoryRepository) => ({
    async getUserUpdates(userId: number, limit = 6) {
        return repository.getUserUpdates(userId, limit);
    },

    async getUserMediaHistory(userId: number, mediaType: MediaType, mediaId: number) {
        return repository.getUserMediaHistory(userId, mediaType, mediaId);
    },

    async deleteMediaUpdatesForUser(userId: number, mediaType: MediaType, mediaId: number) {
        const updates = await repository.getUserMediaHistory(userId, mediaType, mediaId);
        const updateIds = updates.map((update) => update.id);
        await repository.deleteUserUpdates(userId, updateIds, false);
    },

    async deleteMediaUpdates(mediaType: MediaType, mediaIds: number[]) {
        return repository.deleteMediaUpdates(mediaType, mediaIds);
    },

    async deleteRecentInitialAdd(userId: number, mediaType: MediaType, mediaId: number) {
        return repository.deleteRecentInitialAdd(userId, mediaType, mediaId);
    },

    async getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        return repository.getUserUpdatesPaginated(filters, userId)
    },

    async getFollowsUpdates(profileOwnerId: number, actor: Actor, limit = 10) {
        return repository.getFollowsUpdates(profileOwnerId, actor, limit);
    },

    async deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        return repository.deleteUserUpdates(userId, updateIds, returnData);
    },

    async logUpdate({ userId, mediaType, media, updateType, payload, timestamp }: LogUpdateParams) {
        await repository.logUpdate({ userId, mediaType, media, updateType, payload, timestamp });
    },
});


export type UpdateHistoryService = ReturnType<typeof createUpdateHistoryService>;
