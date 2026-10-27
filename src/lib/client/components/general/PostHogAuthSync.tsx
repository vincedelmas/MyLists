import {clientEnv} from "@/env/client";
import type {PostHog} from "posthog-js";
import {useEffect, useRef} from "react";
import {useLocation} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";


let posthog: PostHog | null = null;


export function PostHogAuthSync() {
    const location = useLocation();
    const { currentUser } = useAuth();
    const prevSync = useRef<{ href: string; userId: string | null; username: string | undefined } | null>(null);

    const username = currentUser?.name;
    const userId = currentUser?.id ? String(currentUser.id) : null;
    const isSensitiveRoute = location.pathname.startsWith("/reset-password");

    useEffect(() => {
        const key = clientEnv.VITE_PUBLIC_POSTHOG_KEY;
        if (isSensitiveRoute || !import.meta.env.PROD || !key) {
            prevSync.current = null;
            return;
        }

        let cancelled = false;

        void import("posthog-js").then(({ default: posthogClient }) => {
            if (cancelled) return;

            posthog ??= posthogClient.init(key, {
                autocapture: false,
                disable_surveys: false,
                capture_pageview: false,
                capture_pageleave: false,
                persistence: "localStorage",
                disable_session_recording: true,
                person_profiles: "identified_only",
                api_host: clientEnv.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
            });

            const prev = prevSync.current;

            if (!prev || prev.userId !== userId || prev.username !== username) {
                if (userId) {
                    posthog.identify(userId, username ? { username } : undefined);
                }
                else {
                    posthog.reset();
                }
            }

            if (!prev || prev.href !== location.href) {
                posthog.capture("$pageview");
            }

            prevSync.current = { href: location.href, userId, username };
        }).catch(error => {
            if (!cancelled) {
                console.warn("Analytics could not be loaded", error);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [isSensitiveRoute, location.href, userId, username]);

    return null;
}
