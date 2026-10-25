import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Animated, Keyboard, ScrollView, View } from "react-native";
import { SectionTabs } from "./section-tabs";
import { colors } from "../theme";

export function PagedTabs<T extends string>({ tabs, value, onChange, children }: {
    tabs: Parameters<typeof SectionTabs<T>>[0]["tabs"];
    value: T;
    onChange: (value: T) => void;
    children: (tab: T) => ReactNode;
}) {
    const pageIndex = useRef(tabs.findIndex((tab) => tab.value === value));
    const [width, setWidth] = useState(0);
    const pager = useRef<ComponentRef<typeof ScrollView>>(null);
    const [scrollX] = useState(() => new Animated.Value(0));

    useEffect(() => {
        const x = pageIndex.current * width;
        pager.current?.scrollTo({ x, animated: false });
        scrollX.setValue(x);
    }, [width, scrollX]);

    return (
        <View style={{ flex: 1 }} onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
            <View>
                <SectionTabs
                    tabs={tabs}
                    value={value}
                    showIndicator={false}
                    onChange={(next) => {
                        pageIndex.current = tabs.findIndex((tab) => tab.value === next);
                        onChange(next);
                        Keyboard.dismiss();
                        pager.current?.scrollTo({ x: pageIndex.current * width, animated: true });
                    }}
                />
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: "absolute", bottom: 0, left: 0,
                        height: 2, width: width / tabs.length, backgroundColor: colors.accent,
                        transform: [{ translateX: Animated.divide(scrollX, tabs.length) }],
                    }}
                />
            </View>
            {width > 0 && (
                <Animated.ScrollView
                    ref={pager}
                    horizontal
                    pagingEnabled
                    directionalLockEnabled
                    nestedScrollEnabled
                    bounces={false}
                    overScrollMode="never"
                    showsHorizontalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                    onMomentumScrollEnd={({ nativeEvent }) => {
                        pageIndex.current = Math.round(nativeEvent.contentOffset.x / width);
                        onChange(tabs[pageIndex.current].value);
                    }}
                >
                    {tabs.map((tab) => (
                        <View
                            key={tab.value}
                            style={{ width, height: "100%" }}
                            accessibilityElementsHidden={value !== tab.value}
                            importantForAccessibility={value === tab.value ? "auto" : "no-hide-descendants"}
                        >
                            {children(tab.value)}
                        </View>
                    ))}
                </Animated.ScrollView>
            )}
        </View>
    );
}
