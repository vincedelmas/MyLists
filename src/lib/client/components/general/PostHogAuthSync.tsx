import {useEffect} from "react";
import posthogClient, {type PostHog} from "posthog-js";
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

        posthog ??= posthogClient.init(clientEnv.VITE_PUBLIC_POSTHOG_KEY, {
            person_profiles: "identified_only",
            api_host: clientEnv.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
            persistence: "localStorage",
            capture_pageview: false,
            capture_pageleave: false,
            autocapture: false,
            disable_session_recording: true,
            disable_surveys: false,
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
