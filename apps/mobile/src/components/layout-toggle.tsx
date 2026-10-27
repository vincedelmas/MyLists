import {colors} from "../theme";
import {StyleSheet, Pressable, View} from "react-native";
import {LayoutGrid, List} from "lucide-react-native";


export type MediaLayout = "grid" | "list";


export function LayoutToggle({ value, onChange }: { value: MediaLayout; onChange: (value: MediaLayout) => void }) {
    return (
        <View style={styles.row}>
            {(
                [
                    { value: "grid", Icon: LayoutGrid },
                    { value: "list", Icon: List },
                ] as const
            ).map(({ value: mode, Icon }) => (
                <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityLabel={`${mode === "grid" ? "Grid" : "List"} view`}
                    accessibilityState={{ selected: mode === value }}
                    onPress={() => onChange(mode)}
                    style={({ pressed }) => ([styles.action, { backgroundColor: mode === value ? colors.secondary : "transparent", opacity: pressed ? 0.6 : 1 }])}
                >
                    <Icon
                        size={18}
                        color={mode === value ? colors.accent : colors.muted}
                    />
                </Pressable>
            ))
            }
        </View>
    );
}


const styles = StyleSheet.create({
    row: { flexDirection: "row", gap: 2 },
    action: {
        padding: 11,
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8
    },
});
