import {SimpleSearch} from "@/lib/schemas";
import {ProfileUpdatesReadService} from "@/lib/server/domain/profile/profile-updates-read.service";


export class UserUpdatesService {
    private readonly updates = new ProfileUpdatesReadService();

    async getUserUpdates(userId: number, limit = 6) {
        return this.updates.getUserUpdates(userId, limit);
    }

    async getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        return this.updates.getUserUpdatesPaginated(filters, userId);
    }

    async getFollowsUpdates(profileOwnerId: number, visitorId?: number, limit = 10) {
        return this.updates.getFollowsUpdates(profileOwnerId, visitorId, limit);
    }

    async deleteUserUpdates(userId: number, updateIds: number[], returnData: boolean) {
        return this.updates.deleteUserUpdates(userId, updateIds, returnData);
    }
}
