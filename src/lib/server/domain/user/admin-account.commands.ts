import {AdminUpdatePayload} from "@/lib/schemas";
import {FormattedError} from "@/lib/utils/error-classes";
import {UserRepository} from "@/lib/server/domain/user/user.repository";
import {AccountDeletionCommands} from "@/lib/server/domain/user/account-deletion.commands";


export class AdminAccountCommands {
    constructor(
        private readonly deletion: AccountDeletionCommands,
        private readonly repository = UserRepository,
    ) {}

    async update(userId: number | undefined, payload: AdminUpdatePayload) {
        const { deleteUser, ...updatePayload } = payload;
        if (!userId && (updatePayload.showUpdateModal !== undefined || updatePayload.showOnboarding !== undefined)) {
            return this.repository.adminUpdateGlobalFlag(updatePayload);
        }
        if (!userId) return;
        if (deleteUser) return this.deletion.delete({ userId, type: "manual" });

        const allowedKeys = new Set<keyof typeof updatePayload>(["emailVerified", "role", "privacy", "showOnboarding", "showUpdateModal"]);
        if (!Object.keys(updatePayload).every((key) => allowedKeys.has(key as keyof typeof updatePayload))) {
            throw new FormattedError("Invalid payload");
        }
        await this.repository.adminUpdateUser(userId, updatePayload);
    }
}
