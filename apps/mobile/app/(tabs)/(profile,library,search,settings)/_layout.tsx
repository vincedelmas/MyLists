import {Stack} from "expo-router";
import {colors} from "../../../src/theme";
import {recordNavigationTiming} from "../../../src/lib/diagnostics/navigation-timing";


export const unstable_settings = {
    anchor: "index",
    profile: { anchor: "index" },
    library: { anchor: "lists" },
    search: { anchor: "search" },
    settings: { anchor: "settings" },
};


export default function TabStack() {
    return (
        <Stack
            screenListeners={({ route }) => ({
                focus: () => recordNavigationTiming("screen-focused", `/${route.name}`),
                transitionStart: (event) => {
                    if (!event.data.closing) recordNavigationTiming("transition-start", `/${route.name}`);
                },
                transitionEnd: (event) => {
                    if (!event.data.closing) recordNavigationTiming("transition-end", `/${route.name}`);
                },
            })}
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
        />
    );
}
