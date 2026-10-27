import {colors} from "../theme";
import {SectionTabs, type SectionTab} from "./section-tabs";
import {Animated, Keyboard, ScrollView, View} from "react-native";
import {useEffect, useRef, useState, type ComponentRef, type ReactNode} from "react";


interface PagedTabsProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    tabs: readonly SectionTab<T>[];
    children: (tab: T) => ReactNode;
}


export function PagedTabs<T extends string>({ tabs, value, onChange, children }: PagedTabsProps<T>) {
    const [width, setWidth] = useState(0);
    const pager = useRef<ComponentRef<typeof ScrollView>>(null);
    const [scrollX] = useState(() => new Animated.Value(0));
    const pageIndex = useRef(tabs.findIndex((tab) => tab.value === value));

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
                        transform: [{ translateX: Animated.divide(scrollX, tabs.length) }],
                        height: 2, width: width / tabs.length, backgroundColor: colors.accent,
                    }}
                />
            </View>
            {width > 0 && (
                <Animated.ScrollView
                    horizontal
                    ref={pager}
                    pagingEnabled
                    bounces={false}
                    nestedScrollEnabled
                    overScrollMode="never"
                    directionalLockEnabled
                    scrollEventThrottle={16}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    showsHorizontalScrollIndicator={false}
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
