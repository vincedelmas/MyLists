import {SearchType} from "@/lib/schemas";
import {WarningFailedPayload, WarningSentPayload} from "@/lib/types/inactive.types";
import type {InactiveAccountRepository} from "@/lib/server/domain/account/inactive-account.repository";


export const createInactiveAccountService = (repository: InactiveAccountRepository) => {
    return {
        async getAdminOverview(data: SearchType) {
            return repository.getAdminOverview(data);
        },

        async getWarningTargets(limit: number, maxRetries: number) {
            return repository.getWarningTargets(limit, maxRetries);
        },

        async warningSent(payload: WarningSentPayload) {
            return repository.warningSent(payload);
        },

        async warningFailed(payload: WarningFailedPayload) {
            return repository.warningFailed(payload);
        },

        async markResurrectedUsers() {
            return repository.markResurrectedUsers();
        },

        async findUserIdByTokenHash(warningTokenHash: string) {
            const row = await repository.findUserIdByTokenHash(warningTokenHash);
            return row?.userId;
        },

        async getDeletionTargets(maxRetries: number) {
            return repository.getDeletionTargets(maxRetries);
        },

        async markAsDeleted(lifecycleId: number, userId: number, username: string) {
            return repository.markAsDeleted(lifecycleId, userId, username);
        },

        async deleteRowsForUser(userId: number) {
            return repository.deleteRowsForUser(userId);
        },
    };
}


export type InactiveAccountService = ReturnType<typeof createInactiveAccountService>;
