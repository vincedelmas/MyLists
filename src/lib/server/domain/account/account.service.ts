import {user} from "@/lib/server/database/schema";
import {CacheManager} from "@/lib/server/core/cache-manager";
import {withTransaction} from "@/lib/server/database/async-storage";
import {FormattedError, ValidationError} from "@/lib/utils/error-classes";
import {AdminUpdatePayload, GeneralSettings, SearchType} from "@/lib/schemas";
import {AccountRepository} from "@/lib/server/domain/account/account.repository";
import {InactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";


type DeleteUserAccountPayload =
    | { type: "manual"; userId: number }
    | { type: "inactive"; userId: number; lifecycleId: number; username: string };


const LAST_SEEN_CACHE_KEY = "lastSeen";
const UPDATE_THRESHOLD_MS = 5 * 60 * 1000;


export class AccountService {
    constructor(
        private repository: typeof AccountRepository,
        private inactiveAccountService: InactiveAccountService,
    ) {
    }

    // --- Admin functions --------------------------------------------

    async getUserOverviewForAdmin() {
        const userStats = await this.repository.getUserStatsForAdmin();
        const recentUsers = await this.repository.getActiveUsersForAdmin(20);
        const usersPerPrivacy = await this.repository.getUsersPerPrivacyValueForAdmin();
        const cumulativeUsersPerMonth = await this.repository.getCumUsersPerMonthForAdmin();

        return {
            ...userStats,
            recentUsers,
            usersPerPrivacy,
            cumulativeUsersPerMonth,
        };
    }

    async getPaginatedUsersForAdmin(data: SearchType) {
        return this.repository.getAdminPaginatedUsers(data);
    }

    async updateUserForAdmin(userId: number | undefined, payload: AdminUpdatePayload) {
        const { deleteUser, ...updatePayload } = payload;

        if (!userId && (updatePayload.showUpdateModal !== undefined || updatePayload.showOnboarding !== undefined)) {
            return this.repository.adminUpdateGlobalFlag(updatePayload);
        }

        if (!userId) return;

        if (deleteUser) {
            return this.deleteUserAccount({ userId, type: "manual" });
        }

        const allowedKeys = new Set<keyof typeof updatePayload>(["emailVerified", "role", "privacy", "showOnboarding", "showUpdateModal"]);
        const isValidPayload = Object.keys(updatePayload).every((k) => allowedKeys.has(k as keyof typeof updatePayload));

        if (!isValidPayload) {
            throw new FormattedError("Invalid payload");
        }

        await this.repository.adminUpdateUser(userId, updatePayload);
    }

    async updateUserLastSeen(cacheManager: CacheManager, userId: number) {
        const cacheKey = `${LAST_SEEN_CACHE_KEY}:${userId}`;
        if (await cacheManager.get(cacheKey)) return;
        await cacheManager.set(cacheKey, true, UPDATE_THRESHOLD_MS);

        return this.repository.updateUserLastSeen(userId);
    }

    async deleteUserAccount(payload: DeleteUserAccountPayload) {
        return withTransaction(async () => {
            if (payload.type === "manual") {
                await this.inactiveAccountService.deleteRowsForUser(payload.userId);
            }

            if (payload.type === "inactive") {
                const markedDeleted = await this.inactiveAccountService.markAsDeleted(payload.lifecycleId, payload.userId, payload.username);
                if (!markedDeleted) return false;
            }

            await this.repository.deleteUserAccount(payload.userId);
            return true;
        });
    }

    async getMinimalUserSettings(userId: number) {
        return this.repository.getMinimalUserSettings(userId);
    }

    async updateUserSettings(userId: number, payload: Partial<typeof user.$inferInsert>) {
        await this.repository.updateUserSettings(userId, payload);
    }

    async updateShowOnboarding(userId: number) {
        await this.repository.updateShowOnboarding(userId);
    }

    async updateFeatureFlag(userId: number) {
        return this.repository.updateFeatureFlag(userId);
    }

    async getUserByUsername(username: string) {
        return this.repository.findByUsername(username);
    }

    async getUserById(userId: number) {
        return this.repository.findById(userId);
    }

    async findUserByName(name: string) {
        const isUsernameTaken = await this.repository.findUserByName(name);
        if (isUsernameTaken) {
            throw new ValidationError<GeneralSettings>("username", "Invalid username. Please select another one.");
        }
    }

}
