import {beginNavigationTiming, recordNavigationTiming} from "./diagnostics/navigation-timing";
import {router, useSegments, type Href} from "expo-router";

// Shared detail routes exist in every tab. Qualify links so opening a title
// preserves the selected tab and its back stack instead of choosing another match.
export function useTabPush() {
    const segments: readonly string[] = useSegments();
    const tab = segments[1];
    return (destination: Href) => {
        const href = typeof destination === "string" ? {pathname: destination} : destination;
        beginNavigationTiming(href.pathname, "navigation-requested");
        router.push({...href, pathname: `/(tabs)/${tab}${href.pathname}`});
        recordNavigationTiming("router-returned", href.pathname);
    };
}
