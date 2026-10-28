import {useEffect, useRef} from "react";
import {useLocation} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {loadAnalytics} from "@/lib/client/analytics";


export function PostHogAuthSync() {
    const location = useLocation();
    const { currentUser } = useAuth();
    const prevSync = useRef<{ href: string; userId: string | null; username: string | undefined } | null>(null);

    const username = currentUser?.name;
    const userId = currentUser?.id ? String(currentUser.id) : null;
    const isSensitiveRoute = location.pathname.startsWith("/reset-password");

    useEffect(() => {
        if (isSensitiveRoute) return;

        let cancelled = false;

        void loadAnalytics().then(posthog => {
            if (cancelled || !posthog) return;

            const prev = prevSync.current;

            if (!prev || prev.userId !== userId || prev.username !== username) {
                if (userId) {
                    posthog.identify(userId, username ? { username } : undefined);
                }
                else if (prev?.userId) {
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
