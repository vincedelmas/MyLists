import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import { Animated, View } from "react-native";
import { colors } from "../theme";
import { SectionTabs } from "./section-tabs";
import { CollapsingScrollContext } from "../hooks/use-collapsing-scroll";
import { useCollapsingTabs } from "../hooks/use-collapsing-tabs";

export function CollapsingTabs<T extends string>({
    tabs,
    initialTab,
    header,
    children,
}: {
    tabs: readonly { value: T; label: string; icon: LucideIcon }[];
    initialTab: T;
    header: ReactNode | ((selectTab: (tab: T) => void) => ReactNode);
    children: (tab: T) => ReactNode;
}) {
    const { tab, selectTab, context, translateY, setHeaderHeight, setTabBarHeight, setViewportHeight } =
        useCollapsingTabs(initialTab);
    return (
        <CollapsingScrollContext.Provider value={context}>
            <View
                style={{ flex: 1, overflow: "hidden" }}
                onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            >
                {context.headerHeight > 0 && <View style={{ flex: 1 }}>{children(tab)}</View>}
                <Animated.View
                    pointerEvents="box-none"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1,
                        backgroundColor: colors.background,
                        transform: [{ translateY }],
                    }}
                >
                    <View
                        pointerEvents="box-none"
                        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
                    >
                        {typeof header === "function" ? header(selectTab) : header}
                    </View>
                    <SectionTabs
                        tabs={tabs}
                        value={tab}
                        onChange={selectTab}
                        onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
                    />
                </Animated.View>
            </View>
        </CollapsingScrollContext.Provider>
    );
}
