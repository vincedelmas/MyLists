import {router, useSegments, type Href} from "expo-router";
import {beginNavigationTiming, recordNavigationTiming} from "./diagnostics/navigation-timing";


export function useTabPush() {
    const segments: readonly string[] = useSegments();
    const tab = segments[1];

    return (destination: Href) => {
        const href = typeof destination === "string"
            ? { pathname: destination }
            : destination;

        beginNavigationTiming(href.pathname, "navigation-requested");
        router.push({ ...href, pathname: `/(tabs)/${tab}${href.pathname}` });

        recordNavigationTiming("router-returned", href.pathname);
    };
}
