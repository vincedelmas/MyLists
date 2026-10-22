import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "./ui";
import { colors } from "../theme";

// Scrollable section navigation; Expo UI has no universal top-tab control.
export function TopTabs<T extends string>({
    value,
    tabs,
    onChange,
}: {
    value: T;
    tabs: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                {tabs.map((tab) => (
                    <Pressable
                        key={tab.value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: tab.value === value }}
                        onPress={() => onChange(tab.value)}
                        style={({ pressed }) => [
                            styles.tab,
                            tab.value === value && styles.active,
                            pressed && { opacity: 0.6 },
                        ]}
                    >
                        <AppText
                            style={{
                                fontSize: 13,
                                fontWeight: "600",
                                color: tab.value === value ? colors.accent : colors.muted,
                            }}
                        >
                            {tab.label}
                        </AppText>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { borderBottomWidth: 1, borderBottomColor: colors.border },
    tabs: { paddingHorizontal: 8 },
    tab: {
        paddingHorizontal: 12,
        minHeight: 48,
        justifyContent: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    active: { borderBottomColor: colors.accent },
});
