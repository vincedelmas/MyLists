import {useEffect} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useQueryClient, type QueryClient} from "@tanstack/react-query";
import {postUnlockClientAchievement} from "@/lib/server/functions/user-achievements";
import type {ClientEventAchievementCode, UnlockedAchievementToast} from "@/lib/types/achievements.types";


type Listener = (items: UnlockedAchievementToast[]) => void;


const listeners = new Set<Listener>();
const triggeredInSession = new Set<string>();


export const subscribeAchievementToasts = (listener: Listener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};


export const useClientAchievement = (codeName: ClientEventAchievementCode) => {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!currentUser?.id) return;
        void triggerClientAchievement(codeName, queryClient, currentUser.id);
    }, [codeName, currentUser?.id, queryClient]);
};


export const enqueueAchievementToasts = (items: UnlockedAchievementToast[]) => {
    if (items.length === 0) return;
    for (const listener of listeners) {
        listener(items);
    }
};


export const triggerClientAchievement = async (codeName: ClientEventAchievementCode, queryClient?: QueryClient, userId?: number) => {
    if (!userId) return;

    const sessionKey = `${userId}:${codeName}`;
    if (triggeredInSession.has(sessionKey)) return;

    triggeredInSession.add(sessionKey);

    try {
        const { unlocked } = await postUnlockClientAchievement({ data: { codeName } });
        if (unlocked) {
            enqueueAchievementToasts([unlocked]);
            if (queryClient) {
                void queryClient.invalidateQueries({ queryKey: ["profile"] });
                void queryClient.invalidateQueries({ queryKey: ["achievementPage"] });
            }
        }
    }
    catch {
        // Non-critical Easter egg unlock, swallow silently.
    }
};
