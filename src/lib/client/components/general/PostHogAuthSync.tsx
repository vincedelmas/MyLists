import {useEffect} from "react";
import {usePostHog} from "posthog-js/react";
import {useAuth} from "@/lib/client/hooks/use-auth";


export function PostHogAuthSync() {
    const posthog = usePostHog();
    const { currentUser } = useAuth();

    const username = currentUser?.name;
    const userId = currentUser?.id ? String(currentUser.id) : null;

    useEffect(() => {
        if (!posthog) return;

        if (userId) {
            posthog.identify(userId, { username });
        }
        else {
            posthog.reset();
        }
    }, [posthog, userId, username]);

    return null;
}
