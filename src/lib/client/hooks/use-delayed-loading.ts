import {useEffect, useRef, useState} from "react";


export const useDelayedLoading = (isLoading: boolean, delayMs: number, minimumDurationMs: number) => {
    const visibleSinceRef = useRef(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            if (isVisible) return;

            const showTimeout = window.setTimeout(() => {
                visibleSinceRef.current = Date.now();
                setIsVisible(true);
            }, delayMs);

            return () => window.clearTimeout(showTimeout);
        }

        if (!isVisible) return;

        const elapsed = Date.now() - visibleSinceRef.current;
        const hideTimeout = window.setTimeout(
            () => setIsVisible(false),
            Math.max(0, minimumDurationMs - elapsed)
        );

        return () => window.clearTimeout(hideTimeout);
    }, [delayMs, isLoading, isVisible, minimumDurationMs]);

    return isVisible;
};
