import {backendUrl} from "./config";
import {authClient} from "./auth-client";
import type {getMobileProfile, getMobileProfileActivity} from "../../../../src/lib/server/mobile/profile";


// Type-only references infer the actual JSON payload; server code is never
// imported into Metro's runtime dependency graph.
export type MobileProfile = NonNullable<Awaited<ReturnType<typeof getMobileProfile>>>;
export type MobileProfileActivity = Awaited<ReturnType<typeof getMobileProfileActivity>>;

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

const request = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
    const timeout = AbortSignal.timeout(15_000);
    const response = await fetch(`${backendUrl}/api/mobile/v1${path}`, {
        headers: {accept: "application/json", cookie: await authClient.getCookie()},
        credentials: "omit",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });

    if (!response.ok) {
        if (response.status === 401) authClient.$store.notify("$sessionSignal");
        const {error} = await response.json() as {error: {message: string}};
        throw new ApiError(response.status, error.message);
    }
    return response.json();
};

export const api = {
    profile: (signal?: AbortSignal) => request<MobileProfile>("/profile", signal),
    profileActivity: (signal?: AbortSignal) => request<MobileProfileActivity>("/profile/activity", signal),
};

export const assetUrl = (path: string) => new URL(path, backendUrl).href;
