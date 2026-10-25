import { useMemo } from "react";
import { PanResponder } from "react-native";

export function useSwipeTabs<T extends string>(tabs: readonly { value: T }[], value: T, onChange: (value: T) => void) {
    return useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, { dx, dy, numberActiveTouches }) =>
            numberActiveTouches === 1 && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
        onPanResponderRelease: (_, { dx, dy }) => {
            if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;

            const nextTab = tabs[tabs.findIndex((tab) => tab.value === value) + (dx < 0 ? 1 : -1)];
            if (nextTab) onChange(nextTab.value);
        },
    }), [tabs, value, onChange]).panHandlers;
}
