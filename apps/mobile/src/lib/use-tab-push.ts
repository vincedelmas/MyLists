import {router, useSegments, type Href} from "expo-router";

// Shared detail routes exist in every tab. Qualify links so opening a title
// preserves the selected tab and its back stack instead of choosing another match.
export function useTabPush() {
    const segments: readonly string[] = useSegments();
    const tab = segments[1];
    return (destination: Href) => {
        const href = typeof destination === "string" ? {pathname: destination} : destination;
        router.push({...href, pathname: `/(tabs)/${tab}${href.pathname}`});
    };
}
