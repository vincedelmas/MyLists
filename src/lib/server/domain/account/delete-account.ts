import {APIError} from "better-auth/api";
import {auth} from "@/lib/server/core/auth";
import {getContainer} from "@/lib/server/core/container";
import {ValidationError} from "@/lib/utils/error-classes";
import type {DeleteAccountForm, PasswordSettingsForm} from "@/lib/schemas/user-settings.schema";

export const deleteConfirmedAccount = async (userId: number, headers: Headers, { currentPassword, confirmation }: DeleteAccountForm) => {
    const accountService = await getContainer().then((c) => c.services.account);
    const { hasPassword, providers } = accountService.getAccountSecurity(userId);

    if (hasPassword || providers.length === 0) {
        if (!currentPassword) {
            throw new ValidationError<Pick<PasswordSettingsForm, "currentPassword">>("currentPassword", "Current password is required");
        }
        try {
            await auth.api.verifyPassword({
                headers,
                body: { password: currentPassword },
            });
        }
        catch (error) {
            if (!(error instanceof APIError) || error.body?.code !== "INVALID_PASSWORD") {
                throw error;
            }

            throw new ValidationError<Pick<PasswordSettingsForm, "currentPassword">>("currentPassword", "Current password incorrect");
        }
    }

    if (!hasPassword && providers.length > 0 && confirmation !== "DELETE") {
        throw new ValidationError<DeleteAccountForm>("confirmation", 'Type DELETE to confirm account deletion.');
    }

    const result = accountService.deleteUserAccount({ userId, type: "manual" });

    return result;
};
