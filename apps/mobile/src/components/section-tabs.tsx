import type { LucideIcon } from "lucide-react-native";
import { Pressable, View, type ViewProps } from "react-native";
import { AppText } from "./ui";
import { colors } from "../theme";

export function SectionTabs<T extends string>({
    tabs,
    value,
    onChange,
    onLayout,
}: {
    tabs: readonly { value: T; label: string; icon: LucideIcon }[];
    value: T;
    onChange: (value: T) => void;
    onLayout?: ViewProps["onLayout"];
}) {
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
                    accessibilityState={{ selected: value === key }}
                    onPress={() => onChange(key)}
                    style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 52,
                        paddingVertical: 6,
                        paddingHorizontal: 2,
                        gap: 3,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.6 : 1,
                        borderBottomWidth: 2,
                        borderBottomColor: value === key ? colors.accent : "transparent",
                    })}
                >
                    <Icon size={19} color={value === key ? colors.accent : colors.muted} />
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
        </View>
    );
}
