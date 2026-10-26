import {Pressable, StyleSheet, View} from "react-native";
import {ChevronRight} from "lucide-react-native";
import {AppText} from "./ui";
import {colors} from "../theme";

export function SectionHeading({ title, action }: {
    title: string;
    action?: { label: string; accessibilityLabel?: string; onPress: () => void };
}) {
    return <View style={styles.heading}>
        <View style={styles.identity}><AppText heading style={styles.title}>{title}</AppText></View>
        {action && <Pressable accessibilityRole="button" accessibilityLabel={action.accessibilityLabel ?? action.label} onPress={action.onPress}
                              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <AppText style={styles.actionLabel}>{action.label}</AppText><ChevronRight size={15} color={colors.accent}/>
        </Pressable>}
    </View>;
}

const styles = StyleSheet.create({
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    identity: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontSize: 18, lineHeight: 25 },
    action: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 },
    actionLabel: { fontSize: 12, lineHeight: 18, fontWeight: "500", color: colors.accent },
    pressed: { opacity: 0.6 },
});
