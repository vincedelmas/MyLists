import {useEffect, useRef} from "react";
import {useRouter} from "@tanstack/react-router";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useQueryClient} from "@tanstack/react-query";
import {authOptions} from "@/lib/client/react-query/query-options";


const AUTH_SYNC_STORAGE_KEY = "mylists:auth-sync";


export function AuthSessionSync() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const currentUserId = currentUser?.id ?? null;
    const suppressNextBroadcastRef = useRef(false);
    const previousUserIdRef = useRef<number | null | undefined>(undefined);

    const broadcastAuthChange = (userId: number | null | undefined) => {
        try {
            localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify({ userId }));
        }
        catch {
            console.warn("Could not sync auth state to local storage");
        }
    };

    useEffect(() => {
        const refreshAuthenticatedRouteData = async () => {
            await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== authOptions.queryKey[0] });
            await router.invalidate();
        };

        const previousUserId = previousUserIdRef.current;
        const isInitialSync = previousUserId === undefined;

        if (isInitialSync) {
            previousUserIdRef.current = currentUserId;

            if (currentUserId) {
                broadcastAuthChange(currentUserId);
            }

            return;
        }

        if (previousUserId === currentUserId) return;

        previousUserIdRef.current = currentUserId;
        void refreshAuthenticatedRouteData();

        if (suppressNextBroadcastRef.current) {
            suppressNextBroadcastRef.current = false;
            return;
        }

        broadcastAuthChange(currentUserId);
    }, [currentUserId, queryClient, router]);

    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return;

            suppressNextBroadcastRef.current = true;
            void queryClient.fetchQuery({ ...authOptions, staleTime: 0 });
        };

        window.addEventListener("storage", onStorage);

        return () => {
            window.removeEventListener("storage", onStorage);
        };
    }, [queryClient]);

    return null;
}
