import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {ArrowUpRight, Layers3, LibraryBig} from "lucide-react-native";
import {Pressable, StyleSheet, View} from "react-native";
import {api} from "../../lib/api-client";
import {AppText, QueryPanel} from "../../components/ui";
import {SectionHeading} from "../../components/section-heading";
import {useTabPush} from "../../hooks/use-tab-push";
import {colors} from "../../theme";
import {formatCount} from "./profile-formatting";

export function ProfilePinnedLists({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const push = useTabPush();
    const query = useQuery({ queryKey: ["profile", userId, "extras"], queryFn: ({ signal }) => api.profileExtras(signal, userId), select: data => data.pins, enabled: focused });
    if (query.data?.length === 0) return null;
    return <QueryPanel query={query}>{items => <View style={styles.section}>
        <SectionHeading title="Pinned lists & collections"/>
        <View style={styles.grid}>{items.map(item => {
            const Icon = item.kind === "dynamic" ? Layers3 : LibraryBig;
            return <Pressable key={`${item.kind}:${item.id}`} accessibilityRole="button" accessibilityLabel={`${item.title}, ${formatCount(item.total)} media`}
                              onPress={() => push({ pathname: "/library/[kind]", params: { kind: item.kind, id: item.id, userId } })}
                              style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.cardHeading}><View style={styles.icon}><Icon size={18} color={colors.accent}/></View><ArrowUpRight size={16} color={colors.muted}/></View>
                <AppText numberOfLines={2} style={styles.title}>{item.title}</AppText>
                <AppText muted style={styles.caption}>{item.kind === "dynamic" ? "Dynamic list" : "Collection"} · {formatCount(item.total)} media</AppText>
            </Pressable>;
        })}</View>
    </View>}</QueryPanel>;
}

const styles = StyleSheet.create({
    section: { gap: 12 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: { flexBasis: "45%", flexGrow: 1, gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    icon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.accent}12` },
    title: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
    caption: { fontSize: 11, lineHeight: 17 },
    pressed: { opacity: 0.6 },
});
