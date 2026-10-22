import { AppText } from "./ui";
import { colors } from "../theme";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

interface SectionTabsProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    onLayout?: ViewProps["onLayout"];
    tabs: readonly {
        value: T;
        label: string;
        icon: LucideIcon;
    }[];
    action?: {
        label: string;
        busy?: boolean;
        icon: LucideIcon;
        disabled?: boolean;
        onPress: () => void;
    };
}

export function SectionTabs<T extends string>({ tabs, value, onChange, onLayout, action }: SectionTabsProps<T>) {
    return (
        <View onLayout={onLayout} style={styles.container}>
            {tabs.map(({ value: key, label, icon: Icon }) => (
                <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    onPress={() => onChange(key)}
                    accessibilityState={{ selected: value === key }}
                    style={({ pressed }) => [styles.tab, value === key && styles.selected, pressed && styles.pressed]}
                >
                    <Icon size={19} color={value === key ? colors.accent : colors.muted} />
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
                    style={({ pressed }) => [styles.tab, action.disabled ? styles.disabled : pressed && styles.pressed]}
                >
                    <action.icon size={19} color={colors.muted} />
                    <AppText style={styles.actionLabel}>{action.busy ? "Refreshing" : action.label}</AppText>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
