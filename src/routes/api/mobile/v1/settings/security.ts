import {createFileRoute} from "@tanstack/react-router";
import {mobileRequest} from "@/lib/server/mobile/request";
import {getMobileAccountSecurity} from "@/lib/server/mobile/settings";
import {deleteAccountSchema} from "@/lib/schemas/user-settings.schema";
import {deleteConfirmedAccount} from "@/lib/server/domain/account/delete-account";
import {clearAdminCookie} from "@/lib/server/core/admin-auth";

export const Route = createFileRoute("/api/mobile/v1/settings/security")({
    server: {
        handlers: {
            GET: ({ request }) => mobileRequest(request, getMobileAccountSecurity),
            DELETE: ({ request }) => mobileRequest(request, async userId => {
                await deleteConfirmedAccount(userId, request.headers, deleteAccountSchema.parse(await request.json()));
                clearAdminCookie();
                return { deleted: true };
            }),
        }
    },
});
