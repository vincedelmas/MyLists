import {SimpleSearch} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {LogUpdateParams} from "@/lib/types/user-updates.types";
import {UserUpdatesRepository} from "@/lib/server/domain/user/user-updates.repository";


export class UserUpdatesService {
    constructor(private repository: typeof UserUpdatesRepository) {
    }

    async getUserUpdates(userId: number, limit = 6) {
        return this.repository.getUserUpdates(userId, limit);
    }

    async getUserMediaHistory(userId: number, mediaType: MediaType, mediaId: number) {
        return this.repository.getUserMediaHistory(userId, mediaType, mediaId);
    }

    async deleteMediaUpdatesForUser(userId: number, mediaType: MediaType, mediaId: number) {
        const updates = await this.repository.getUserMediaHistory(userId, mediaType, mediaId);
        const updateIds = updates.map((update) => update.id);
        await this.repository.deleteUserUpdates(userId, updateIds, false);
    }

    async deleteMediaUpdates(mediaType: MediaType, mediaIds: number[]) {
        return this.repository.deleteMediaUpdates(mediaType, mediaIds);
    }

    async deleteRecentInitialAdd(userId: number, mediaType: MediaType, mediaId: number) {
        return this.repository.deleteRecentInitialAdd(userId, mediaType, mediaId);
    }

    async getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        return this.repository.getUserUpdatesPaginated(filters, userId)
    }

    async getFollowsUpdates(profileOwnerId: number, visitorId?: number, limit = 10) {
        return this.repository.getFollowsUpdates(profileOwnerId, visitorId, limit);
    }

    async deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        return this.repository.deleteUserUpdates(userId, updateIds, returnData);
    }

    async logUpdate({ userId, mediaType, media, updateType, payload, timestamp }: LogUpdateParams) {
        await this.repository.logUpdate({ userId, mediaType, media, updateType, payload, timestamp });
    }
}
