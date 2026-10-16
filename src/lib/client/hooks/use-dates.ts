import {toDateInputValue} from "@/lib/utils/formatting/date";
import {useEffect, useState, useSyncExternalStore} from "react";


const subscribeToCurrentDate = (onStoreChange: () => void) => {
    let timeout: ReturnType<typeof setTimeout>;

    const refresh = () => {
        const now = new Date();
        const nextMidnight = new Date(now);
        
        nextMidnight.setHours(24, 0, 0, 0);
        clearTimeout(timeout);
        timeout = setTimeout(refresh, nextMidnight.getTime() - now.getTime());

        onStoreChange();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
        clearTimeout(timeout);
        window.removeEventListener("focus", refresh);
        document.removeEventListener("visibilitychange", refresh);
    };
};


export const useCurrentDate = () => {
    return useSyncExternalStore(
        subscribeToCurrentDate,
        () => toDateInputValue(new Date()),
        () => toDateInputValue(new Date())
    );
};


export const useNow = (delay = 1000) => {
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, delay);
        return () => clearInterval(interval);
    }, [delay]);

    return now;
};
