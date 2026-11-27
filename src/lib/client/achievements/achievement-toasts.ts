import {useEffect, useSyncExternalStore} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {useQueryClient, type QueryClient} from "@tanstack/react-query";
import {postUnlockClientAchievement} from "@/lib/server/functions/user-achievements";
import type {ClientEventAchievementCode, UnlockedAchievementToast} from "@/lib/types/achievements.types";


type Listener = (items: UnlockedAchievementToast[]) => void;


const SOUND_MUTED_STORAGE_KEY = "mylists:achievement-sound-muted";
const CLIENT_ACH_STORAGE_PREFIX = "mylists:client-achievements:";

const listeners = new Set<Listener>();
const soundListeners = new Set<() => void>();
const inFlightRequests = new Set<string>();


const readCompletedClientCodes = (userId: number): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = window.localStorage.getItem(`${CLIENT_ACH_STORAGE_PREFIX}${userId}`);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? new Set(parsed.filter((item): item is string => typeof item === "string")) : new Set();
    }
    catch {
        return new Set();
    }
};


const markCompletedClientCode = (userId: number, codeName: string) => {
    if (typeof window === "undefined") return;
    try {
        const existing = readCompletedClientCodes(userId);
        existing.add(codeName);
        window.localStorage.setItem(`${CLIENT_ACH_STORAGE_PREFIX}${userId}`, JSON.stringify([...existing]));
    }
    catch {
        // Ignore storage quota / private mode errors
    }
};


export const isAchievementSoundMuted = () => {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === "1";
    }
    catch {
        return false;
    }
};


export const toggleAchievementSoundMuted = () => {
    const nextMuted = !isAchievementSoundMuted();
    try {
        window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, nextMuted ? "1" : "0");
    }
    catch {
        // Ignore storage errors
    }
    for (const listener of soundListeners) {
        listener();
    }
    return nextMuted;
};


const subscribeSoundMuted = (listener: () => void) => {
    soundListeners.add(listener);
    return () => {
        soundListeners.delete(listener);
    };
};


export const useAchievementSoundMuted = () => {
    return useSyncExternalStore(subscribeSoundMuted, isAchievementSoundMuted, () => false);
};


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


export const maybeTriggerNightOwl = (queryClient: QueryClient, userId?: number) => {
    if (!userId || typeof window === "undefined") return;
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
        void triggerClientAchievement("secret_night_owl", queryClient, userId);
    }
};


export const triggerClientAchievement = async (codeName: ClientEventAchievementCode, queryClient?: QueryClient, userId?: number) => {
    if (!userId) return;

    const completed = readCompletedClientCodes(userId);
    if (completed.has(codeName)) return;

    const sessionKey = `${userId}:${codeName}`;
    if (inFlightRequests.has(sessionKey)) return;

    inFlightRequests.add(sessionKey);

    try {
        const { unlocked } = await postUnlockClientAchievement({ data: { codeName } });
        markCompletedClientCode(userId, codeName);

        if (unlocked) {
            enqueueAchievementToasts([unlocked]);
            if (queryClient) {
                void queryClient.invalidateQueries({ queryKey: ["profile"] });
                void queryClient.invalidateQueries({ queryKey: ["achievementPage"] });
            }
        }
    }
    catch {
        // Non-critical Easter egg unlock, allow retry later.
    }
    finally {
        inFlightRequests.delete(sessionKey);
    }
};
