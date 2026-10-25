import {useEffect, useState} from "react";
import {useIsFocused} from "expo-router";
import {AppState} from "react-native";

export function usePuzzleReset(resetsAt: string, onReset: () => void) {
    const focused = useIsFocused();
    const [remaining, setRemaining] = useState(() => Math.max(0, Date.parse(resetsAt) - Date.now()));
    useEffect(() => {
        if (!focused) return;
        const tick = () => {
            if (AppState.currentState !== "active") return;
            const next = Math.max(0, Date.parse(resetsAt) - Date.now());
            setRemaining(next);
            if (next === 0) {
                clearInterval(timer);
                onReset();
            }
        };
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [resetsAt, onReset, focused]);
    return [Math.floor(remaining / 3_600_000), Math.floor(remaining / 60_000) % 60, Math.floor(remaining / 1000) % 60]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
}
