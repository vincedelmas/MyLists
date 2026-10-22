import { AppText } from "./ui";
import { colors } from "../theme";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, ScrollView, View, type ViewProps } from "react-native";

interface SectionTabsProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    onLayout?: ViewProps["onLayout"];
    scrollable?: boolean;
    tabs: readonly {
        value: T;
        label: string;
        icon: LucideIcon;
        count?: number;
    }[];
    action?: {
        label: string;
        busy?: boolean;
        icon: LucideIcon;
        disabled?: boolean;
        onPress: () => void;
    };
}

export function SectionTabs<T extends string>({
    tabs,
    value,
    onChange,
    onLayout,
    action,
    scrollable = false,
}: SectionTabsProps<T>) {
    const content = (
        <>
            {tabs.map(({ value: key, label, icon: Icon, count }) => (
                <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
                    onPress={() => onChange(key)}
                    accessibilityState={{ selected: value === key }}
                    style={({ pressed }) => [
                        styles.tab,
                        scrollable && styles.scrollTab,
                        value === key && styles.selected,
                        pressed && styles.pressed,
                    ]}
                >
                    <View style={styles.iconRow}>
                        <Icon size={19} color={value === key ? colors.accent : colors.muted} />
                        {count !== undefined && (
                            <AppText style={[styles.count, value === key && styles.selectedLabel]}>
                                {count.toLocaleString()}
                            </AppText>
                        )}
                    </View>
                    <AppText
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={[styles.label, value === key && styles.selectedLabel]}
                    >
                        {label}
                    </AppText>
                </Pressable>
            ))}
            {action && (
                <Pressable
                    onPress={action.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    accessibilityState={{ disabled: action.disabled, busy: action.busy }}
                    disabled={action.disabled}
                    style={({ pressed }) => [
                        styles.tab,
                        scrollable && styles.scrollTab,
                        action.disabled ? styles.disabled : pressed && styles.pressed,
                    ]}
                >
                    <action.icon size={19} color={colors.muted} />
                    <AppText style={styles.actionLabel}>{action.busy ? "Refreshing" : action.label}</AppText>
                </Pressable>
            )}
        </>
    );
    return scrollable ? (
        <ScrollView
            horizontal
            onLayout={onLayout}
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.container}
        >
            {content}
        </ScrollView>
    ) : (
        <View onLayout={onLayout} style={styles.container}>
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 0 },
    scrollTab: { flex: 0, minWidth: 80, paddingHorizontal: 12 },
    iconRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    count: { fontSize: 11, lineHeight: 16, fontWeight: "700", color: colors.muted, fontVariant: ["tabular-nums"] },
    container: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    tab: {
        gap: 3,
        flex: 1,
        minHeight: 52,
        paddingVertical: 6,
        alignItems: "center",
        paddingHorizontal: 2,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
        justifyContent: "center",
    },
    selected: { borderBottomColor: colors.accent },
    label: { fontSize: 10, lineHeight: 14, fontWeight: "600", color: colors.muted },
    selectedLabel: { color: colors.accent },
    actionLabel: { fontSize: 10, lineHeight: 14, color: colors.muted },
    pressed: { opacity: 0.6 },
    disabled: { opacity: 0.4 },
});
