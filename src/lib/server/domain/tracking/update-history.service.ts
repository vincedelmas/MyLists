import {SimpleSearch} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {Actor} from "@/lib/server/authorization";
import {LogUpdateParams} from "@/lib/types/user-updates.types";
import {withTransaction} from "@/lib/server/database/async-storage";
import {UpdateHistoryRepository} from "@/lib/server/domain/tracking/update-history.repository";


export class UpdateHistoryService {
    constructor(private repository: typeof UpdateHistoryRepository) {
    }

    async getUserUpdates(userId: number, limit = 6) {
        return this.repository.getUserUpdates(userId, limit);
    }

    getUserMediaHistory(userId: number, mediaType: MediaType, mediaId: number, pagination?: { limit: number; offset: number }) {
        return this.repository.getUserMediaHistory(userId, mediaType, mediaId, pagination);
    }

    deleteMediaUpdatesForUser(userId: number, mediaType: MediaType, mediaId: number) {
        const updates = this.repository.getUserMediaHistory(userId, mediaType, mediaId);
        const updateIds = updates.map((update) => update.id);
        this.repository.deleteUserUpdates(userId, updateIds, false);
    }

    deleteMediaUpdates(mediaType: MediaType, mediaIds: number[]) {
        return this.repository.deleteMediaUpdates(mediaType, mediaIds);
    }

    deleteRecentInitialAdd(userId: number, mediaType: MediaType, mediaId: number) {
        return this.repository.deleteRecentInitialAdd(userId, mediaType, mediaId);
    }

    async getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        return this.repository.getUserUpdatesPaginated(filters, userId)
    }

    async getFollowsUpdates(profileOwnerId: number, actor: Actor, limit = 10) {
        return this.repository.getFollowsUpdates(profileOwnerId, actor, limit);
    }

    deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        return withTransaction(() => this.repository.deleteUserUpdates(userId, updateIds, returnData));
    }

    logUpdate({ userId, mediaType, media, updateType, payload, timestamp }: LogUpdateParams) {
        this.repository.logUpdate({ userId, mediaType, media, updateType, payload, timestamp });
    }
}
