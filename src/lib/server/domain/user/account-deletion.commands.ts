import {withTransaction} from "@/lib/server/database/async-storage";
import {UserRepository} from "@/lib/server/domain/user/user.repository";
import {InactiveAccountCommands} from "@/lib/server/domain/user/inactive-account.commands";


type DeleteUserAccountPayload =
    | { type: "manual"; userId: number }
    | { type: "inactive"; userId: number; lifecycleId: number; username: string };


export class AccountDeletionCommands {
    constructor(
        private readonly inactiveAccounts: InactiveAccountCommands,
        private readonly repository = UserRepository,
    ) {}

    delete(payload: DeleteUserAccountPayload) {
        return withTransaction(async () => {
            if (payload.type === "manual") {
                await this.inactiveAccounts.deleteRowsForUser(payload.userId);
            }
            if (payload.type === "inactive") {
                const markedDeleted = await this.inactiveAccounts.markAsDeleted(payload.lifecycleId, payload.userId, payload.username);
                if (!markedDeleted) return false;
            }
            await this.repository.deleteUserAccount(payload.userId);
            return true;
        });
    }

    deleteNeverActivated() {
        return this.repository.deleteNonActivatedOldUsers();
    }
}
