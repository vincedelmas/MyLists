import {useCallback, useMemo, useRef, useState} from "react";
import {Animated, type NativeScrollEvent, type NativeSyntheticEvent} from "react-native";


export function useCollapsingTabs<T extends string>(initialTab: T) {
    const [tab, setTab] = useState(initialTab);
    const offsets = useRef(new Map<T, number>());
    const [headerHeight, setHeaderHeight] = useState(0);
    const [tabBarHeight, setTabBarHeight] = useState(52);
    const [initialOffset, setInitialOffset] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollY] = useState(() => new Animated.Value(0));

    const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => offsets.current.set(tab, event.nativeEvent.contentOffset.y),
    }), [scrollY, tab]);

    const selectTab = (next: T) => {
        if (next === tab) return;
        const current = Math.max(0, offsets.current.get(tab) ?? initialOffset);
        const nextOffset = current < headerHeight ? current : Math.max(headerHeight, offsets.current.get(next) ?? 0);

        offsets.current.set(next, nextOffset);
        scrollY.setValue(nextOffset);

        setInitialOffset(nextOffset);
        setTab(next);
    };

    const getOffset = useCallback(() => offsets.current.get(tab) ?? initialOffset, [tab, initialOffset]);

    const context = useMemo(() => ({
        onScroll,
        getOffset,
        headerHeight,
        tabBarHeight,
        initialOffset,
        viewportHeight,
    }), [onScroll, initialOffset, headerHeight, tabBarHeight, viewportHeight, getOffset]);

    const translateY = scrollY.interpolate({
        extrapolate: "clamp",
        outputRange: [0, -headerHeight],
        inputRange: [0, Math.max(headerHeight, 1)],
    });

    return {
        tab,
        context,
        selectTab,
        translateY,
        setHeaderHeight,
        setTabBarHeight,
        setViewportHeight,
    };
}
