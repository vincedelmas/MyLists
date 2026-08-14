import {useEffect} from "react";
import PostHog from "posthog-js-lite";
import {clientEnv} from "@/env/client";
import {useAuth} from "@/lib/client/hooks/use-auth";


const posthog = (typeof window !== "undefined" && import.meta.env.PROD && clientEnv.VITE_PUBLIC_POSTHOG_KEY)
    ? new PostHog(clientEnv.VITE_PUBLIC_POSTHOG_KEY, {
        captureHistoryEvents: true,
        personProfiles: "identified_only",
        host: clientEnv.VITE_PUBLIC_POSTHOG_HOST || undefined,
    })
    : null;


posthog?.capture("$pageview");


export function PostHogAuthSync() {
    const { currentUser } = useAuth();

    const username = currentUser?.name;
    const userId = currentUser?.id ? String(currentUser.id) : null;

    useEffect(() => {
        if (!posthog) return;

        if (userId) {
            posthog.identify(userId, username ? { username } : undefined);
        }
        else {
            posthog.reset();
        }
    }, [userId, username]);

    return null;
}
