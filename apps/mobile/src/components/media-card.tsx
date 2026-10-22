import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Cover } from "./ui";
import type { MediaLayout } from "./layout-toggle";
import { colors } from "../theme";

// Shared cover treatment for activity and tracking/collection grids.
export const MediaCard = memo(function MediaCard({
    name,
    cover,
    detail,
    children,
    onPress,
    layout = "grid",
}: {
    layout?: MediaLayout;
    name: string;
    cover: string | null;
    detail?: string;
    children?: ReactNode;
    onPress: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={name}
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                layout === "grid" ? styles.grid : styles.list,
                pressed && { opacity: 0.6 },
            ]}
        >
            <Cover uri={cover} label={name} style={layout === "grid" ? styles.cover : styles.listCover} />
            <View style={[styles.caption, layout === "list" && { flex: 1 }]}>
                <AppText numberOfLines={2} style={styles.title}>
                    {name}
                </AppText>
                {detail && (
                    <AppText muted numberOfLines={2} style={styles.detail}>
                        {detail}
                    </AppText>
                )}
                {children}
            </View>
        </Pressable>
    );
});
const styles = StyleSheet.create({
    card: { flex: 1, padding: 6 },
    grid: { maxWidth: "50%" },
    list: { flexDirection: "row", gap: 12, alignItems: "center" },
    listCover: { width: 56, height: 82 },
    cover: { width: "100%", height: undefined, aspectRatio: 2 / 3, borderRadius: 10 },
    caption: { gap: 4, paddingVertical: 8 },
    title: { fontSize: 13, fontWeight: "600", color: colors.text },
    detail: { fontSize: 11 },
});
