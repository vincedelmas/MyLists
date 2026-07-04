import {useEffect, useRef, useState} from "react";


export const useDelayedLoading = (isLoading: boolean, pendingMs = 200, pendingMinMs = 350) => {
    const visibleSinceRef = useRef(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            if (isVisible) return;

            const showTimeout = window.setTimeout(() => {
                visibleSinceRef.current = Date.now();
                setIsVisible(true);
            }, pendingMs);

            return () => window.clearTimeout(showTimeout);
        }

        if (!isVisible) return;

        const elapsed = Date.now() - visibleSinceRef.current;
        const hideTimeout = window.setTimeout(
            () => setIsVisible(false),
            Math.max(0, pendingMinMs - elapsed)
        );

        return () => window.clearTimeout(hideTimeout);
    }, [pendingMs, isLoading, isVisible, pendingMinMs]);

    return isVisible;
};
