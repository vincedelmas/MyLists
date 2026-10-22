import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import { Animated, Pressable, View } from "react-native";
import { colors } from "../theme";
import { AppText } from "./ui";
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
    header: ReactNode;
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
                        {header}
                    </View>
                    <View
                        onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}
                        style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}
                    >
                        {tabs.map(({ value, label, icon: Icon }) => (
                            <Pressable
                                key={value}
                                accessibilityRole="tab"
                                accessibilityLabel={label}
                                accessibilityState={{ selected: tab === value }}
                                onPress={() => selectTab(value)}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    minHeight: 68,
                                    paddingVertical: 10,
                                    paddingHorizontal: 2,
                                    gap: 6,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: pressed ? 0.6 : 1,
                                    borderBottomWidth: 2,
                                    borderBottomColor: tab === value ? colors.accent : "transparent",
                                })}
                            >
                                <Icon size={22} color={tab === value ? colors.accent : colors.muted} />
                                <AppText
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.8}
                                    style={{
                                        fontSize: 10,
                                        fontWeight: "600",
                                        color: tab === value ? colors.accent : colors.muted,
                                    }}
                                >
                                    {label}
                                </AppText>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </CollapsingScrollContext.Provider>
    );
}
