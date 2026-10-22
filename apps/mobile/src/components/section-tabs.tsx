import {AppText} from "./ui";
import {colors} from "../theme";
import type {LucideIcon} from "lucide-react-native";
import {Pressable, View, type ViewProps} from "react-native";


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
        <View
            onLayout={onLayout}
            style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.background,
            }}
        >
            {tabs.map(({ value: key, label, icon: Icon }) => (
                <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    onPress={() => onChange(key)}
                    accessibilityState={{ selected: value === key }}
                    style={({ pressed }) => ({
                        gap: 3,
                        flex: 1,
                        minHeight: 52,
                        paddingVertical: 6,
                        alignItems: "center",
                        paddingHorizontal: 2,
                        borderBottomWidth: 2,
                        justifyContent: "center",
                        opacity: pressed ? 0.6 : 1,
                        borderBottomColor: value === key ? colors.accent : "transparent",
                    })}
                >
                    <Icon
                        size={19}
                        color={value === key ? colors.accent : colors.muted}
                    />
                    <AppText
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={{
                            fontSize: 10,
                            lineHeight: 14,
                            fontWeight: "600",
                            color: value === key ? colors.accent : colors.muted,
                        }}
                    >
                        {label}
                    </AppText>
                </Pressable>
            ))}
            {action &&
                <Pressable
                    onPress={action.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    accessibilityState={{ disabled: action.disabled, busy: action.busy }} disabled={action.disabled}
                    style={({ pressed }) => ({
                        gap: 3,
                        flex: 1,
                        minHeight: 52,
                        paddingVertical: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: action.disabled ? 0.4 : pressed ? 0.6 : 1
                    })}
                >
                    <action.icon
                        size={19}
                        color={colors.muted}
                    />
                    <AppText style={{ fontSize: 10, lineHeight: 14, color: colors.muted }}>
                        {action.busy ? "Refreshing" : action.label}
                    </AppText>
                </Pressable>
            }
        </View>
    );
}
