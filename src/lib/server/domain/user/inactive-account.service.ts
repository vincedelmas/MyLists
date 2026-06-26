import {SearchType} from "@/lib/schemas";
import {WarningFailedPayload, WarningSentPayload} from "@/lib/types/inactive.types";
import {InactiveAccountRepository} from "@/lib/server/domain/user/inactive-account.repository";


export class InactiveAccountService {
    constructor(private repository: typeof InactiveAccountRepository) {
    }

    async getAdminOverview(data: SearchType) {
        return this.repository.getAdminOverview(data);
    }

    async getWarningTargets(limit: number, maxRetries: number) {
        return this.repository.getWarningTargets(limit, maxRetries);
    }

    async warningSent(payload: WarningSentPayload) {
        return this.repository.warningSent(payload);
    }

    async warningFailed(payload: WarningFailedPayload) {
        return this.repository.warningFailed(payload);
    }

    async markResurrectedUsers() {
        return this.repository.markResurrectedUsers();
    }

    async findUserIdByTokenHash(warningTokenHash: string) {
        const row = await this.repository.findUserIdByTokenHash(warningTokenHash);
        return row?.userId;
    }

    async getDeletionTargets(maxRetries: number) {
        return this.repository.getDeletionTargets(maxRetries);
    }

    async markAsDeleted(lifecycleId: number, userId: number, username: string) {
        return this.repository.markAsDeleted(lifecycleId, userId, username);
    }

    async deleteRowsForUser(userId: number) {
        return this.repository.deleteRowsForUser(userId);
    }
}
