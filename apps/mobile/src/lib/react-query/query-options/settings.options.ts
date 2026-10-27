import {api} from "../../api-client";
import {queryOptions} from "@tanstack/react-query";


export const settingsOptions = queryOptions({
    queryKey: ["settings"],
    queryFn: ({ signal }) => api.settings(signal),
});


export const profileSettingsOptions = queryOptions({
    queryKey: ["settings", "profile"],
    queryFn: ({ signal }) => api.profileSettings(signal)
});


export const accountSecurityOptions = queryOptions({
    queryKey: ["settings", "security"],
    queryFn: ({ signal }) => api.accountSecurity(signal)
});


export const connectedAppsOptions = queryOptions({
    queryKey: ["settings", "apps"],
    queryFn: ({ signal }) => api.connectedApps(signal)
});
