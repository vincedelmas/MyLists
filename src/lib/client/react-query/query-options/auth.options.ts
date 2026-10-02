import {queryOptions} from "@tanstack/react-query";
import {getAuthMethods, getCurrentUser} from "@/lib/server/functions/auth";
import {getConnectedApps, getMcpConsentRequest} from "@/lib/server/functions/mcp";


export const authOptions = queryOptions({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    staleTime: 10 * 60 * 1000,
});


export const authMethodsOptions = queryOptions({
    queryKey: ["authMethods"],
    queryFn: () => getAuthMethods(),
    staleTime: Infinity,
});


export const connectedAppsOptions = queryOptions({
    queryKey: ["connected-apps"],
    queryFn: () => getConnectedApps(),
});


export const mcpConsentRequestOptions = (oauthQuery: string) => queryOptions({
    queryKey: ["mcp-consent", oauthQuery],
    queryFn: () => getMcpConsentRequest({ data: { oauthQuery } }),
    gcTime: 0,
    staleTime: 0,
    retry: false,
});
