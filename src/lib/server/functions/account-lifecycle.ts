import {serverEnv} from "@/env/server";
import {tokenSchema} from "@/lib/schemas";
import {createServerFn} from "@tanstack/react-start";
import {getContainer} from "@/lib/server/core/container";
import {signCookieValue} from "@/lib/utils/signed-cookies";


export const getReactivateInactiveAccount = createServerFn({ method: "GET" })
    .validator(tokenSchema)
    .handler(async ({ data: { token } }) => {
        const inactiveAccountService = await getContainer().then((c) => c.services.inactiveAccount);
        const warningTokenHash = await signCookieValue(token, serverEnv.BETTER_AUTH_SECRET);
        const success = await inactiveAccountService.reactivateByTokenHash(warningTokenHash);

        return { success };
    });
