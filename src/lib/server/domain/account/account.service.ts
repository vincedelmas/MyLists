import {user} from "@/lib/server/database/schema";
import {CacheManager} from "@/lib/server/core/cache-manager";
import {withTransaction} from "@/lib/server/database/async-storage";
import {FormattedError, ValidationError} from "@/lib/utils/error-classes";
import type {AdminUpdatePayload, GeneralSettings, SearchType} from "@/lib/schemas";
import type {AccountRepository} from "@/lib/server/domain/account/account.repository";
import type {InactiveAccountService} from "@/lib/server/domain/account/inactive-account.service";


type DeleteUserAccountPayload =
    | { type: "manual"; userId: number }
    | { type: "inactive"; userId: number; lifecycleId: number; username: string };


const LAST_SEEN_CACHE_KEY = "lastSeen";
const UPDATE_THRESHOLD_MS = 5 * 60 * 1000;


export const createAccountService = (repository: AccountRepository, inactiveAccountService: InactiveAccountService) => {
    const service = {
        async getUserOverviewForAdmin() {
            const userStats = await repository.getUserStatsForAdmin();
            const recentUsers = await repository.getActiveUsersForAdmin(20);
            const usersPerPrivacy = await repository.getUsersPerPrivacyValueForAdmin();
            const cumulativeUsersPerMonth = await repository.getCumUsersPerMonthForAdmin();

            return {
                ...userStats,
                recentUsers,
                usersPerPrivacy,
                cumulativeUsersPerMonth,
            };
        },

        async getPaginatedUsersForAdmin(data: SearchType) {
            return repository.getAdminPaginatedUsers(data);
        },

        async updateUserForAdmin(userId: number | undefined, payload: AdminUpdatePayload) {
            const { deleteUser, ...updatePayload } = payload;

            if (!userId && (updatePayload.showUpdateModal !== undefined || updatePayload.showOnboarding !== undefined)) {
                return repository.adminUpdateGlobalFlag(updatePayload);
            }

            if (!userId) return;

            if (deleteUser) {
                return service.deleteUserAccount({ userId, type: "manual" });
            }

            const allowedKeys = new Set<keyof typeof updatePayload>(["emailVerified", "role", "privacy", "showOnboarding", "showUpdateModal"]);
            const isValidPayload = Object.keys(updatePayload).every((k) => allowedKeys.has(k as keyof typeof updatePayload));

            if (!isValidPayload) {
                throw new FormattedError("Invalid payload");
            }

            await repository.adminUpdateUser(userId, updatePayload);
        },

        async updateUserLastSeen(cacheManager: CacheManager, userId: number) {
            const cacheKey = `${LAST_SEEN_CACHE_KEY}:${userId}`;
            if (await cacheManager.get(cacheKey)) return;
            await cacheManager.set(cacheKey, true, UPDATE_THRESHOLD_MS);

            return repository.updateUserLastSeen(userId);
        },

        async deleteUserAccount(payload: DeleteUserAccountPayload) {
            return withTransaction(async () => {
                if (payload.type === "manual") {
                    await inactiveAccountService.deleteRowsForUser(payload.userId);
                }

                if (payload.type === "inactive") {
                    const markedDeleted = await inactiveAccountService.markAsDeleted(payload.lifecycleId, payload.userId, payload.username);
                    if (!markedDeleted) return false;
                }

                await repository.deleteUserAccount(payload.userId);
                return true;
            });
        },

        async getMinimalUserSettings(userId: number) {
            return repository.getMinimalUserSettings(userId);
        },

        async updateUserSettings(userId: number, payload: Partial<typeof user.$inferInsert>) {
            await repository.updateUserSettings(userId, payload);
        },

        async updateShowOnboarding(userId: number) {
            await repository.updateShowOnboarding(userId);
        },

        async updateFeatureFlag(userId: number) {
            return repository.updateFeatureFlag(userId);
        },

        async getUserByUsername(username: string) {
            return repository.findByUsername(username);
        },

        async getUserById(userId: number) {
            return repository.findById(userId);
        },

        async findUserByName(name: string) {
            const isUsernameTaken = await repository.findUserByName(name);
            if (isUsernameTaken) {
                throw new ValidationError<GeneralSettings>("username", "Invalid username. Please select another one.");
            }
        },
    };

    return service;
};
