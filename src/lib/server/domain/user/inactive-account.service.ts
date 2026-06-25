import {SearchType} from "@/lib/schemas";
import {withTransaction} from "@/lib/server/database/async-storage";
import {UserRepository} from "@/lib/server/domain/user/user.repository";
import {InactiveAccountRepository} from "@/lib/server/domain/user/inactive-account.repository";
import {InactiveAccountWarningFailedPayload, InactiveAccountWarningSentPayload} from "@/lib/types/inactive.types";


export class InactiveAccountService {
    constructor(
        private repository: typeof InactiveAccountRepository,
        private userRepository: typeof UserRepository,
    ) {
    }

    async getAdminOverview(data: SearchType) {
        return this.repository.getInactiveAccountDeletionAdminOverview(data);
    }

    async getWarningTargets(limit: number, maxRetries: number) {
        return this.repository.getWarningTargets(limit, maxRetries);
    }

    async warningSent(payload: InactiveAccountWarningSentPayload) {
        return this.repository.inactiveAccountWarningSent(payload);
    }

    async warningFailed(payload: InactiveAccountWarningFailedPayload) {
        return this.repository.recordInactiveAccountWarningFailed(payload);
    }

    async markResurrectedForSeenUsers() {
        return this.repository.markResurrectedForSeenUsers();
    }

    async markResurrectedForUser(userId: number) {
        return this.repository.markResurrectedForUser(userId);
    }

    async reactivateByTokenHash(warningTokenHash: string) {
        const row = await this.repository.findUserIdByWarningTokenHash(warningTokenHash);
        if (!row) return false;

        await this.userRepository.updateUserLastSeen(row.userId);
        await this.repository.markResurrectedForUser(row.userId);

        return true;
    }

    async getDeletionTargets(maxRetries: number) {
        return this.repository.getInactiveAccountDeletionTargets(maxRetries);
    }

    async deleteInactiveAccount(lifecycleId: number, userId: number, username: string) {
        return withTransaction(async () => {
            await this.repository.markDeleted(lifecycleId, username);
            await this.userRepository.deleteUserAccount(userId);
        });
    }

    async deleteRowsForUser(userId: number) {
        return this.repository.deleteRowsForUser(userId);
    }
}
