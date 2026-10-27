import {useEffect, useRef, type ComponentRef} from "react";
import {Pressable, ScrollView, StyleSheet, View} from "react-native";
import type {LucideIcon} from "lucide-react-native";
import {AppText} from "./ui";
import {colors} from "../theme";

export interface ChoiceChip<T extends string> {
    value: T;
    label: string;
    color?: string;
    icon?: LucideIcon;
}

export function ChoiceChips<T extends string>({ options, value, onChange, label, disabled = false }: {
    options: readonly ChoiceChip<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    disabled?: boolean;
}) {
    const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
    const offsets = useRef(new Map<T, number>());

    useEffect(() => {
        scroll.current?.scrollTo({ x: Math.max(0, (offsets.current.get(value) ?? 0) - 16), animated: false });
    }, [value]);

    return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                       accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.scroll} contentContainerStyle={styles.options}>
        {options.map(({ value: key, label: title, icon: Icon, color }) => {
            const selected = key === value;
            const tint = color ?? colors.accent;
            return <Pressable key={key} accessibilityRole="radio" accessibilityLabel={title} disabled={disabled} accessibilityState={{ checked: selected, disabled }}
                              onLayout={event => {
                                  const x = event.nativeEvent.layout.x;
                                  offsets.current.set(key, x);
                                  if (selected) scroll.current?.scrollTo({ x: Math.max(0, x - 16), animated: false });
                              }} onPress={() => onChange(key)}
                              style={({ pressed }) => [styles.target, pressed && styles.pressed]}>
                <View style={[styles.chip, selected && { borderColor: tint, backgroundColor: `${tint}18` }]}>
                    {Icon ? <Icon size={15} color={selected ? tint : colors.muted}/> : color && <View style={[styles.dot, { backgroundColor: color }]}/>}
                    <AppText style={[styles.label, selected && { color: tint }]}>{title}</AppText>
                </View>
            </Pressable>;
        })}
    </ScrollView>;
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 0 },
    options: { paddingHorizontal: 16, gap: 8 },
    target: { minHeight: 48, justifyContent: "center" },
    chip: {
        minHeight: 34, paddingHorizontal: 13, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
        backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 7
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    label: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: colors.muted },
    pressed: { opacity: 0.6 },
});
