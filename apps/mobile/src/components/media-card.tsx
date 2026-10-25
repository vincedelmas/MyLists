import {colors} from "../theme";
import {AppText, Cover} from "./ui";
import {memo, type ReactNode} from "react";
import type {MediaLayout} from "./layout-toggle";
import {Pressable, StyleSheet, View} from "react-native";

interface MediaCardProps {
    name: string;
    detail?: string;
    onPress: () => void;
    layout?: MediaLayout;
    cover: string | null;
    children?: ReactNode;
}

export const MediaCard = memo(function MediaCard({
                                                     name,
                                                     cover,
                                                     detail,
                                                     children,
                                                     onPress,
                                                     layout = "grid",
                                                 }: MediaCardProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityLabel={name}
            accessibilityRole="button"
            style={({ pressed }) => [
                styles.card,
                layout === "grid" ? styles.grid : styles.list,
                pressed && { opacity: 0.6 },
            ]}
        >
            <Cover uri={cover} label={name} style={layout === "grid" ? styles.cover : styles.listCover}/>
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
    detail: { fontSize: 11 },
    grid: { maxWidth: "50%" },
    card: { flex: 1, padding: 6 },
    listCover: { width: 56, height: 82 },
    caption: { gap: 4, paddingVertical: 8 },
    list: { flexDirection: "row", gap: 12, alignItems: "center" },
    title: { fontSize: 13, fontWeight: "600", color: colors.text },
    cover: { width: "100%", height: undefined, aspectRatio: 2 / 3, borderRadius: 10 },
});
