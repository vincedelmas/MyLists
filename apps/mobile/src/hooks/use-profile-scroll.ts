import { createContext, useCallback, useContext, useRef, type ComponentRef } from "react";
import type { ScrollViewProps, ScrollView } from "react-native";

type ScrollResponder = Pick<ComponentRef<typeof ScrollView>, "scrollTo">;

export const ProfileScrollContext = createContext<{
    onScroll: NonNullable<ScrollViewProps["onScroll"]>;
    initialOffset: number;
    getOffset: () => number;
    headerHeight: number;
    tabBarHeight: number;
    viewportHeight: number;
} | null>(null);

// Profile panes use their own scrollable, including virtualized lists. Only the
// header animation is shared; no vertical list is wrapped in a ScrollView.
export function useProfileScroll() {
    const context = useContext(ProfileScrollContext)!;
    const { getOffset, viewportHeight } = context;
    const scrollRef = useRef<{ getScrollResponder: () => ScrollResponder | null | undefined } | null>(null);
    const restored = useRef(false);
    const restoreOffset = useRef(0);
    const attachScroll = useCallback(
        (node: typeof scrollRef.current) => {
            scrollRef.current = node;
            restored.current = false;
            // Capture before the new native scroll view emits its initial events.
            if (node) restoreOffset.current = getOffset();
        },
        [getOffset],
    );
    const restoreScroll = useCallback(() => {
        if (restored.current || viewportHeight === 0) return;
        const responder = scrollRef.current?.getScrollResponder();
        if (responder) {
            responder.scrollTo({ x: 0, y: restoreOffset.current, animated: false });
            restored.current = true;
        }
    }, [viewportHeight]);
    return {
        scrollProps: {
            ref: attachScroll,
            onContentSizeChange: restoreScroll,
            onScroll: context.onScroll,
            scrollEventThrottle: 16,
            contentOffset: { x: 0, y: context.initialOffset },
            scrollIndicatorInsets: { top: context.tabBarHeight },
        },
        contentContainerStyle: {
            paddingTop: context.headerHeight + context.tabBarHeight + 16,
            paddingBottom: 24,
            minHeight: context.viewportHeight + context.headerHeight,
        },
    };
}
