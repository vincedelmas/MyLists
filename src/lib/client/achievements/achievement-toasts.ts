import {useAuth} from "@/lib/client/hooks/use-auth";
import {useEffect, useSyncExternalStore} from "react";
import {useQueryClient, type QueryClient} from "@tanstack/react-query";
import type {ClientEventAchievementCode, UnlockedAchievementToast} from "@/lib/types/achievements.types";
import {getRecentUnlockedAchievements, postUnlockClientAchievement} from "@/lib/server/functions/user-achievements";


type Listener = (items: UnlockedAchievementToast[], overflowCount: number) => void;


const SYNC_COOLDOWN_MS = 60_000;
const CLIENT_ACH_STORAGE_PREFIX = "mylists:client-achievements:";
const SOUND_MUTED_STORAGE_KEY = "mylists:achievement-sound-muted";
const LAST_SEEN_STORAGE_PREFIX = "mylists:achievements-last-seen:";

const listeners = new Set<Listener>();
const inFlightRequests = new Set<string>();
const soundListeners = new Set<() => void>();
const toastedThisSession = new Set<string>();

let lastSyncAt = 0;
let syncInFlight = false;


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


const readLastSeenAt = (userId: number): string | null => {
    if (typeof window === "undefined") return null;
    try {
        return window.localStorage.getItem(`${LAST_SEEN_STORAGE_PREFIX}${userId}`);
    }
    catch {
        return null;
    }
};


const writeLastSeenAt = (userId: number, timestamp: string) => {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(`${LAST_SEEN_STORAGE_PREFIX}${userId}`, timestamp);
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


export const enqueueAchievementToasts = (items: UnlockedAchievementToast[], overflowCount = 0) => {
    if (items.length === 0) return;
    for (const item of items) {
        toastedThisSession.add(item.codeName);
    }
    for (const listener of listeners) {
        listener(items, overflowCount);
    }
};


export const syncRecentAchievements = async (userId: number, queryClient: QueryClient, force = false) => {
    if (typeof window === "undefined" || syncInFlight) return;

    const now = Date.now();
    if (!force && now - lastSyncAt < SYNC_COOLDOWN_MS) return;

    syncInFlight = true;
    lastSyncAt = now;

    try {
        const since = readLastSeenAt(userId);
        const { serverNow, items, totalNew } = await getRecentUnlockedAchievements({
            data: since ? { since } : {},
        });

        writeLastSeenAt(userId, serverNow);
        if (!since || items.length === 0) return;

        const unseen = items.filter((item) => !toastedThisSession.has(item.codeName));
        if (unseen.length === 0) return;

        const overflowCount = Math.max(0, totalNew - items.length);
        enqueueAchievementToasts(unseen, overflowCount);
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        void queryClient.invalidateQueries({ queryKey: ["achievementPage"] });
    }
    catch {
        // Non-critical background sync, retry on next focus
    }
    finally {
        syncInFlight = false;
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
