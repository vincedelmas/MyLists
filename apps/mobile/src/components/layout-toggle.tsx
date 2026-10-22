import {colors} from "../theme";
import {Pressable, View} from "react-native";
import {LayoutGrid, List} from "lucide-react-native";


export type MediaLayout = "grid" | "list";


export function LayoutToggle({ value, onChange }: { value: MediaLayout; onChange: (value: MediaLayout) => void }) {
    return (
        <View style={{ flexDirection: "row", gap: 2 }}>
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
                    style={({ pressed }) => ({
                        padding: 11,
                        borderRadius: 8,
                        backgroundColor: mode === value ? colors.secondary : "transparent",
                        opacity: pressed ? 0.6 : 1,
                    })}
                >
                    <Icon size={18} color={mode === value ? colors.accent : colors.muted}/>
                </Pressable>
            ))}
        </View>
    );
}
