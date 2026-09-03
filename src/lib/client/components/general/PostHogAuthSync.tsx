import {useEffect} from "react";
import PostHog from "posthog-js-lite";
import {clientEnv} from "@/env/client";
import {useLocation} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";


let posthog: PostHog | null = null;


export function PostHogAuthSync() {
    const location = useLocation();
    const { currentUser } = useAuth();

    const username = currentUser?.name;
    const userId = currentUser?.id ? String(currentUser.id) : null;
    const isSensitiveRoute = location.pathname.startsWith("/reset-password");

    useEffect(() => {
        if (isSensitiveRoute || !import.meta.env.PROD || !clientEnv.VITE_PUBLIC_POSTHOG_KEY) return;

        posthog ??= new PostHog(clientEnv.VITE_PUBLIC_POSTHOG_KEY, {
            personProfiles: "identified_only",
            host: clientEnv.VITE_PUBLIC_POSTHOG_HOST || undefined,
        });

        posthog.capture("$pageview");
    }, [isSensitiveRoute, location.href]);

    useEffect(() => {
        if (!posthog || isSensitiveRoute) return;

        if (userId) {
            posthog.identify(userId, username ? { username } : undefined);
        }
        else {
            posthog.reset();
        }
    }, [isSensitiveRoute, userId, username]);

    return null;
}
