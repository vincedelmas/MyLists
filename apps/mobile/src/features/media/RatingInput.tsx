import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Slider } from "@expo/ui";
import { AppText, Button } from "../../components/ui";
import { NativeHost } from "../../components/native-host";
import { Rating } from "../../components/rating";
import { FeelingIcon } from "../../components/feeling-icon";
import { feelingOptions, ratingLabel } from "../../lib/ratings";
import { colors, spacing } from "../../theme";

export function RatingInput({
    value,
    system,
    pending,
    onChange,
    label = "",
}: {
    value: number | null;
    system: "score" | "feeling";
    pending: boolean;
    label?: string;
    onChange: (value: number | null) => void;
}) {
    const [draft, setDraft] = useState(value ?? 5);
    return (
        <View style={styles.content}>
            {label && (
                <View style={styles.heading}>
                    <AppText>{label}</AppText>
                    <Rating value={system === "score" ? draft : value} system={system} />
                </View>
            )}
            {system === "score" ? (
                <>
                    <AppText style={styles.score}>
                        {draft.toFixed(1)}
                        <AppText muted> / 10</AppText>
                    </AppText>
                    <NativeHost>
                        <Slider
                            value={draft}
                            min={0}
                            max={10}
                            step={0.5}
                            disabled={pending}
                            onValueChange={(next) => setDraft(Math.round(next * 10) / 10)}
                        />
                    </NativeHost>
                    <View style={styles.heading}>
                        <AppText muted>0 · Not for me</AppText>
                        <AppText muted>10 · A favorite</AppText>
                    </View>
                    <Button label="Save rating" pending={pending} onPress={() => onChange(draft)} />
                </>
            ) : (
                <>
                    <View style={styles.feelings}>
                        {feelingOptions.map((item) => (
                            <Pressable
                                key={item.value}
                                accessibilityRole="radio"
                                accessibilityLabel={item.label}
                                accessibilityState={{
                                    checked: value !== null && ratingLabel(value, system) === item.label,
                                    disabled: pending,
                                }}
                                disabled={pending}
                                onPress={() => onChange(Number(item.value))}
                                style={({ pressed }) => [
                                    styles.feeling,
                                    value !== null && ratingLabel(value, system) === item.label && styles.selected,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <FeelingIcon value={Number(item.value)} size={30} />
                            </Pressable>
                        ))}
                    </View>
                    <AppText muted style={styles.feelingLabel}>
                        {value === null ? "How did it make you feel?" : ratingLabel(value, system)}
                    </AppText>
                </>
            )}
            {value !== null && (
                <Button secondary label="Remove rating" disabled={pending} onPress={() => onChange(null)} />
            )}
        </View>
    );
}
const styles = StyleSheet.create({
    content: { gap: spacing.lg },
    heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    score: { fontSize: 40, lineHeight: 48, fontWeight: "700", textAlign: "center", fontVariant: ["tabular-nums"] },
    feelings: { flexDirection: "row", gap: spacing.xs },
    feeling: {
        flex: 1,
        minHeight: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "transparent",
    },
    selected: { backgroundColor: colors.secondary, borderColor: colors.accent },
    pressed: { opacity: 0.6 },
    feelingLabel: { textAlign: "center" },
});
