import {colors} from "../theme";
import type {ReactNode} from "react";
import {SectionTabs, type SectionTab, type SectionTabsProps} from "./section-tabs";
import {Animated, StyleSheet, View} from "react-native";
import {useCollapsingTabs} from "../hooks/use-collapsing-tabs";
import {CollapsingScrollContext} from "../hooks/use-collapsing-scroll";

interface CollapsingTabsProps<T extends string> {
    initialTab: T;
    scrollable?: boolean;
    tabBarTopPadding?: number;
    tabLayout?: SectionTabsProps<T>["layout"];
    onTabPress?: (tab: T) => void;
    children: (tab: T) => ReactNode;
    action?: SectionTabsProps<T>["action"];
    header: ReactNode | ((selectTab: (tab: T) => void) => ReactNode);
    tabs: readonly SectionTab<T>[];
}

export function CollapsingTabs<T extends string>({
                                                     tabs,
                                                     initialTab,
                                                     header,
                                                     children,
                                                     onTabPress,
                                                     action,
                                                     scrollable,
                                                     tabBarTopPadding = 0,
                                                     tabLayout,
                                                 }: CollapsingTabsProps<T>) {
    const { tab, selectTab, context, translateY, setHeaderHeight, setTabBarHeight, setViewportHeight } =
        useCollapsingTabs(initialTab);

    return (
        <CollapsingScrollContext.Provider value={context}>
            <View style={styles.container} onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}>
                {context.headerHeight > 0 && <View style={styles.fill}>{children(tab)}</View>}
                <Animated.View pointerEvents="box-none" style={[styles.header, { transform: [{ translateY }] }]}>
                    <View
                        pointerEvents="box-none"
                        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
                    >
                        {typeof header === "function" ? header(selectTab) : header}
                    </View>
                    <View
                        style={{ paddingTop: tabBarTopPadding }}
                        onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
                    >
                        <SectionTabs
                            tabs={tabs}
                            layout={tabLayout}
                            scrollable={scrollable}
                            value={tab}
                            action={action}
                            onChange={onTabPress ?? selectTab}
                        />
                    </View>
                </Animated.View>
            </View>
        </CollapsingScrollContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, overflow: "hidden" },
    fill: { flex: 1 },
    header: { top: 0, left: 0, right: 0, zIndex: 1, position: "absolute", backgroundColor: colors.background },
});
