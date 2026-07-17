import {serverEnv} from "@/env/server";
import {tokenSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {signCookieValue} from "@/lib/utils/signed-cookies";


export const getReactivateInactiveAccount = createServerFn({ method: "GET" })
    .validator(tokenSchema)
    .handler(async ({ data: { token } }) => {
        const container = await getContainer();
        const warningTokenHash = await signCookieValue(token, serverEnv.BETTER_AUTH_SECRET);

        const userId = await container.inactiveAccounts.query.findUserIdByTokenHash(warningTokenHash);
        if (!userId) return { success: false };

        await container.account.settings.recordLastSeen(container.cacheManager, userId);

        return { success: true };
    });
