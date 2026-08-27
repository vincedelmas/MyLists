import {useCallback, useMemo, useSyncExternalStore} from "react";


const BREAKPOINTS = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
};


export function useBreakpoint(key: keyof typeof BREAKPOINTS) {
    const breakpoint = BREAKPOINTS[key];
    const mediaQuery = useMemo(() => window.matchMedia(`(max-width: ${breakpoint - 1}px)`), [breakpoint]);

    const subscribe = useCallback((onStoreChange: () => void) => {
        mediaQuery.addEventListener("change", onStoreChange);
        return () => mediaQuery.removeEventListener("change", onStoreChange);
    }, [mediaQuery]);

    return useSyncExternalStore(subscribe, () => mediaQuery.matches);
}
