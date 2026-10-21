import * as SecureStore from "expo-secure-store";
import {createAuthClient} from "better-auth/react";
import {expoClient} from "@better-auth/expo/client";
import {backendUrl} from "./config";
import {authFetch} from "./auth-fetch";


export const authClient = createAuthClient({
    baseURL: backendUrl,
    fetchOptions: {
        customFetchImpl: authFetch,
        onRequest(context) {
            const url = new URL(context.url);
            if (url.pathname.endsWith("/get-session")) {
                url.searchParams.set("disableCookieCache", "true");
                return { ...context, url };
            }
        },
    },
    plugins: [expoClient({
        scheme: "mylists",
        cookiePrefix: "mylists",
        storagePrefix: `mylists.${encodeURIComponent(backendUrl).replace(/%/g, "_")}`,
        storage: SecureStore,
        // Restore the cookie but verify the session with the server before entering the app.
        disableCache: true,
    })],
});
