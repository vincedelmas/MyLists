import {SimpleSearch} from "@/lib/schemas";
import {MediaType} from "@/lib/utils/enums";
import {ProfileUpdatesRepository} from "@/lib/server/domain/profile/profile-updates.repository";


export class ProfileUpdatesQuery {
    constructor(private readonly repository = ProfileUpdatesRepository) {}

    getUserUpdates(userId: number, limit = 6) {
        return this.repository.getUserUpdates(userId, limit);
    }

    getUserUpdatesPaginated(filters: SimpleSearch, userId?: number) {
        return this.repository.getUserUpdatesPaginated(filters, userId);
    }

    getFollowsUpdates(profileOwnerId: number, visitorId?: number, limit = 10) {
        return this.repository.getFollowsUpdates(profileOwnerId, visitorId, limit);
    }

    mediaUpdatesStatsPerMonth(filters: { userId?: number; mediaType?: MediaType; excludeBulkImports?: boolean }) {
        return this.repository.mediaUpdatesStatsPerMonth(filters);
    }
}
