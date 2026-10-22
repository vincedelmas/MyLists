import {colors} from "../theme";
import type {ReactNode} from "react";
import {SectionTabs} from "./section-tabs";
import {Animated, View} from "react-native";
import type {LucideIcon} from "lucide-react-native";
import {useCollapsingTabs} from "../hooks/use-collapsing-tabs";
import {CollapsingScrollContext} from "../hooks/use-collapsing-scroll";


interface CollapsingTabsProps<T extends string> {
    initialTab: T;
    onTabPress?: (tab: T) => void;
    children: (tab: T) => ReactNode;
    action?: Parameters<typeof SectionTabs<T>>[0]["action"];
    header: ReactNode | ((selectTab: (tab: T) => void) => ReactNode);
    tabs: readonly {
        value: T;
        label: string;
        icon: LucideIcon;
    }[];
}


export function CollapsingTabs<T extends string>({ tabs, initialTab, header, children, onTabPress, action }: CollapsingTabsProps<T>) {
    const { tab, selectTab, context, translateY, setHeaderHeight, setTabBarHeight, setViewportHeight } = useCollapsingTabs(initialTab);

    return (
        <CollapsingScrollContext.Provider value={context}>
            <View style={{ flex: 1, overflow: "hidden" }} onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}>
                {context.headerHeight > 0 && <View style={{ flex: 1 }}>{children(tab)}</View>}
                <Animated.View
                    pointerEvents="box-none"
                    style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1,
                        position: "absolute",
                        transform: [{ translateY }],
                        backgroundColor: colors.background,
                    }}
                >
                    <View pointerEvents="box-none" onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
                        {typeof header === "function" ? header(selectTab) : header}
                    </View>
                    <SectionTabs
                        tabs={tabs}
                        value={tab}
                        action={action}
                        onChange={onTabPress ?? selectTab}
                        onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
                    />
                </Animated.View>
            </View>
        </CollapsingScrollContext.Provider>
    );
}
