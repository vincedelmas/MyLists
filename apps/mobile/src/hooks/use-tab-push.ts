import {useCallback} from "react";
import {router, type Href} from "expo-router";
import type {TabParamList} from "../lib/navigation.types";
import {useNavigation, type NavigationProp} from "expo-router/react-navigation";
import {beginNavigationTiming, recordNavigationTiming} from "../lib/diagnostics/navigation-timing";


export function useTabPush() {
    const navigation = useNavigation();

    return useCallback((destination: Href) => {
        // Every caller lives in a tab's stack. Read its parent on press instead
        // of subscribing every screen and media row to global route changes.
        const tabs = navigation.getParent<NavigationProp<TabParamList>>()!.getState();
        const tab = tabs.routes[tabs.index].name;
        const href = typeof destination === "string"
            ? { pathname: destination }
            : destination;

        beginNavigationTiming(href.pathname, "navigation-requested");
        // Expo generates every shared route for every tab. TypeScript cannot
        // preserve that relationship when joining a runtime tab and typed href.
        router.push({ ...href, pathname: `/(tabs)/${tab}${href.pathname}` } as Href);

        recordNavigationTiming("router-returned", href.pathname);
    }, [navigation]);
}
