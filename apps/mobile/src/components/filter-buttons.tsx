import { Pressable, View } from "react-native";
import { AppText } from "./ui";
import { colors } from "../theme";

export function FilterButtons<T extends string>({ value, options, onChange, label }: {
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
    label: string;
}) {
    return (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {options.map((option) => (
                <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: option.value === value }}
                    onPress={() => onChange(option.value)}
                    style={({ pressed }) => ({
                        minHeight: 44, paddingHorizontal: 16, justifyContent: "center",
                        borderRadius: 22, borderWidth: 1,
                        borderColor: option.value === value ? colors.accent : colors.border,
                        backgroundColor: option.value === value ? colors.primary : colors.surface,
                        opacity: pressed ? 0.7 : 1,
                    })}
                >
                    <AppText style={{ fontSize: 13, color: option.value === value ? colors.accentText : colors.muted }}>
                        {option.label}
                    </AppText>
                </Pressable>
            ))}
        </View>
    );
}
