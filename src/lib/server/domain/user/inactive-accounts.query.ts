import {SearchType} from "@/lib/schemas";
import {InactiveAccountRepository} from "@/lib/server/domain/user/inactive-account.repository";


export class InactiveAccountsQuery {
    constructor(private readonly repository = InactiveAccountRepository) {}

    getAdminOverview(data: SearchType) {
        return this.repository.getAdminOverview(data);
    }

    getWarningTargets(limit: number, maxRetries: number) {
        return this.repository.getWarningTargets(limit, maxRetries);
    }

    async findUserIdByTokenHash(warningTokenHash: string) {
        const row = await this.repository.findUserIdByTokenHash(warningTokenHash);
        return row?.userId;
    }

    getDeletionTargets(maxRetries: number) {
        return this.repository.getDeletionTargets(maxRetries);
    }
}
