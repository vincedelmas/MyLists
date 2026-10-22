import {useCallback} from "react";
import {router, type Href} from "expo-router";
import {useNavigation} from "expo-router/react-navigation";
import {beginNavigationTiming, recordNavigationTiming} from "../lib/diagnostics/navigation-timing";


export function useTabPush() {
    const navigation = useNavigation();

    return useCallback((destination: Href) => {
        // Every caller lives in a tab's stack. Read its parent on press instead
        // of subscribing every screen and media row to global route changes.
        const tabs = navigation.getParent()!.getState();
        const tab = tabs.routes[tabs.index].name;
        const href = typeof destination === "string"
            ? { pathname: destination }
            : destination;

        beginNavigationTiming(href.pathname, "navigation-requested");
        router.push({ ...href, pathname: `/(tabs)/${tab}${href.pathname}` });

        recordNavigationTiming("router-returned", href.pathname);
    }, [navigation]);
}
