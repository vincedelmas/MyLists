import {SearchType} from "@/lib/schemas";
import {UserRepository} from "@/lib/server/domain/user/user.repository";


export class AdminAccountsQuery {
    constructor(private readonly repository = UserRepository) {}

    async getOverview() {
        const [userStats, recentUsers, usersPerPrivacy, cumulativeUsersPerMonth] = await Promise.all([
            this.repository.getUserStatsForAdmin(),
            this.repository.getActiveUsersForAdmin(20),
            this.repository.getUsersPerPrivacyValueForAdmin(),
            this.repository.getCumUsersPerMonthForAdmin(),
        ]);
        return { ...userStats, recentUsers, usersPerPrivacy, cumulativeUsersPerMonth };
    }

    getPaginated(data: SearchType) {
        return this.repository.getAdminPaginatedUsers(data);
    }
}
