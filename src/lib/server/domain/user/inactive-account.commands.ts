import {WarningFailedPayload, WarningSentPayload} from "@/lib/types/inactive.types";
import {InactiveAccountRepository} from "@/lib/server/domain/user/inactive-account.repository";


export class InactiveAccountCommands {
    constructor(private readonly repository = InactiveAccountRepository) {}

    warningSent(payload: WarningSentPayload) {
        return this.repository.warningSent(payload);
    }

    warningFailed(payload: WarningFailedPayload) {
        return this.repository.warningFailed(payload);
    }

    markResurrectedUsers() {
        return this.repository.markResurrectedUsers();
    }

    markAsDeleted(lifecycleId: number, userId: number, username: string) {
        return this.repository.markAsDeleted(lifecycleId, userId, username);
    }

    deleteRowsForUser(userId: number) {
        return this.repository.deleteRowsForUser(userId);
    }
}
