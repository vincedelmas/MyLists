import { memo } from "react";
import { useIsFocused } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { api } from "../../lib/api-client";
import { colors } from "../../theme";
import { useTabPush } from "../../hooks/use-tab-push";
import { AppText, Cover, QueryPanel } from "../../components/ui";
import { profileContinueOptions } from "../../lib/react-query/query-options/profile.options";

export function ProfileContinue() {
    const focused = useIsFocused();
    const push = useTabPush();
    const query = useQuery({ ...profileContinueOptions, enabled: focused });

    return (
        <View style={{ gap: 12 }}>
            <View style={styles.heading}>
                <AppText heading style={{ fontSize: 17 }}>
                    Continue
                </AppText>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View all titles to continue"
                    hitSlop={8}
                    onPress={() => push({ pathname: "/library/[kind]", params: { kind: "continue" } })}
                >
                    <AppText style={{ fontSize: 12, color: colors.accent }}>View all</AppText>
                </Pressable>
            </View>
            <QueryPanel query={query}>
                {(data) =>
                    data.items.length ? (
                        <ContinueCards items={data.items} />
                    ) : (
                        <AppText muted style={{ fontSize: 12 }}>
                            Titles you’re watching, playing or reading will appear here.
                        </AppText>
                    )
                }
            </QueryPanel>
        </View>
    );
}

const ContinueCards = memo(function ContinueCards({
    items,
}: {
    items: Awaited<ReturnType<typeof api.libraryDetail>>["items"];
}) {
    const push = useTabPush();
    return (
        <FlatList
            horizontal
            data={items.slice(0, 8)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
            renderItem={({ item }) => (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Continue ${item.name}`}
                    onPress={() =>
                        push({
                            pathname: "/media/[mediaType]/[mediaId]",
                            params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                        })
                    }
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.6 }]}
                >
                    <Cover uri={item.cover} label={item.name} style={{ width: 80, height: 116 }} />
                    <AppText numberOfLines={2} style={{ fontSize: 12, fontWeight: "600" }}>
                        {item.name}
                    </AppText>
                </Pressable>
            )}
        />
    );
});

const styles = StyleSheet.create({
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    card: { width: 80, gap: 6 },
});
