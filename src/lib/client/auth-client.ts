import {clientEnv} from "@/env/client";
import type {auth} from "@/lib/server/core/auth";
import {createAuthClient} from "better-auth/react";
import {inferAdditionalFields} from "better-auth/client/plugins";
import {oauthProviderClient} from "@better-auth/oauth-provider/client";


const authClient = createAuthClient({
    baseURL: clientEnv.VITE_BASE_URL,
    plugins: [inferAdditionalFields<typeof auth>(), oauthProviderClient()],
});


export default authClient;
