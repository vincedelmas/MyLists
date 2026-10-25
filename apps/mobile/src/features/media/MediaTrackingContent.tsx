import { useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Animated, RefreshControl, StyleSheet, View } from "react-native";
import { AppText, Button, MenuRow, QueryPanel, Section } from "../../components/ui";
import { TrackingEditor } from "./TrackingEditor";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { useTabPush } from "../../hooks/use-tab-push";
import { mediaCollectionsOptions } from "../../lib/react-query/query-options/media.options";
import type { MediaParams, MobileMedia, UpdateInput } from "../../lib/api-client";
import { colors } from "../../theme";

export function MediaTrackingContent({
    params,
    data,
    pending,
    saved,
    error,
    update,
    add,
    remove,
    refetch,
    refreshing,
}: {
    params: MediaParams;
    data: MobileMedia;
    pending: boolean;
    saved: boolean;
    error?: string;
    update: (payload: UpdateInput["payload"], onSaved?: () => void) => void;
    add: () => void;
    remove: () => void;
    refetch: () => unknown;
    refreshing: boolean;
}) {
    const focused = useIsFocused();
    const memberships = useQuery({ ...mediaCollectionsOptions(params), enabled: focused });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    const collections = memberships.data?.filter((item) => item.hasMedia) ?? [];
    return (
        <Animated.FlatList
            {...scrollProps}
            data={collections}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
                <MenuRow
                    title={item.title}
                    detail={`${item.itemsCount} titles · ${item.privacy}`}
                    onPress={() =>
                        push({ pathname: "/library/[kind]", params: { kind: "collection", id: String(item.id) } })
                    }
                />
            )}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, contentContainerStyle]}
            refreshControl={
                <RefreshControl
                    tintColor={colors.accent}
                    refreshing={refreshing}
                    onRefresh={() => {
                        refetch();
                        void memberships.refetch();
                    }}
                />
            }
            ListHeaderComponent={
                <View style={styles.header}>
                    {error && (
                        <AppText accessibilityRole="alert" style={styles.error}>
                            {error}
                        </AppText>
                    )}
                    {saved && (
                        <AppText accessibilityRole="alert" style={styles.success}>
                            Changes saved.
                        </AppText>
                    )}
                    {data.tracking ? (
                        <TrackingEditor data={data} update={update} pending={pending} error={error} />
                    ) : data.active ? (
                        <Section title="Start tracking">
                            <View style={styles.startTracking}>
                                <AppText muted>Keep your progress, rating and comments here.</AppText>
                                <Button label="Add to your list" pending={pending} onPress={add} />
                            </View>
                        </Section>
                    ) : (
                        <AppText muted>Activate this media list in content settings before adding titles.</AppText>
                    )}
                    <AppText heading>Your collections</AppText>
                    <QueryPanel query={memberships}>
                        {() =>
                            !collections.length ? (
                                <AppText muted>This title is not in any of your collections.</AppText>
                            ) : null
                        }
                    </QueryPanel>
                </View>
            }
            ListFooterComponent={
                <View>
                    {data.tracking && (
                        <View style={styles.footer}>
                            {data.tracking.addedAt && (
                                <AppText muted style={styles.caption}>
                                    Added {new Date(data.tracking.addedAt).toLocaleDateString()}
                                </AppText>
                            )}
                            <Button
                                danger
                                label="Remove from your list"
                                pending={pending}
                                onPress={() =>
                                    Alert.alert(
                                        "Remove from your list?",
                                        "Your rating, comments, progress and tracking history for this title will be removed.",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            { text: "Remove", style: "destructive", onPress: remove },
                                        ],
                                    )
                                }
                            />
                        </View>
                    )}
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    content: { padding: 16 },
    header: { gap: 24, paddingBottom: 16 },
    error: { color: colors.error },
    success: { color: colors.accent },
    startTracking: { padding: 16, gap: 12 },
    footer: { gap: 12, paddingTop: 24 },
    caption: { fontSize: 12 },
});
