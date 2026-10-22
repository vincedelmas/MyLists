import { useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Animated, RefreshControl, View } from "react-native";
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
    update: (payload: UpdateInput["payload"]) => void;
    add: () => void;
    remove: () => void;
    refetch: () => unknown;
    refreshing: boolean;
}) {
    const focused = useIsFocused();
    const memberships = useQuery({ ...mediaCollectionsOptions(params), enabled: focused });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    return (
        <Animated.ScrollView
            {...scrollProps}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ padding: 16, gap: 24 }, contentContainerStyle]}
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
        >
            {error && (
                <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                    {error}
                </AppText>
            )}
            {saved && (
                <AppText accessibilityRole="alert" style={{ color: colors.accent }}>
                    Changes saved.
                </AppText>
            )}
            {data.tracking ? (
                <TrackingEditor data={data} update={update} pending={pending} />
            ) : data.active ? (
                <Section title="Start tracking">
                    <View style={{ padding: 16, gap: 12 }}>
                        <AppText muted>Keep your progress, rating and notes here.</AppText>
                        <Button label="Add to your list" pending={pending} onPress={add} />
                    </View>
                </Section>
            ) : (
                <AppText muted>Activate this media list in content settings before adding titles.</AppText>
            )}
            <Section title="Your collections">
                <QueryPanel query={memberships}>
                    {(items) =>
                        items.some((item) => item.hasMedia) ? (
                            items
                                .filter((item) => item.hasMedia)
                                .map((item) => (
                                    <MenuRow
                                        key={item.id}
                                        title={item.title}
                                        detail={`${item.itemsCount} titles · ${item.privacy}`}
                                        onPress={() =>
                                            push({
                                                pathname: "/library/[kind]",
                                                params: { kind: "collection", id: String(item.id) },
                                            })
                                        }
                                    />
                                ))
                        ) : (
                            <AppText muted style={{ padding: 16 }}>
                                This title is not in any of your collections.
                            </AppText>
                        )
                    }
                </QueryPanel>
            </Section>
            {data.tracking && (
                <View style={{ gap: 12, paddingTop: 8 }}>
                    {data.tracking.addedAt && (
                        <AppText muted style={{ fontSize: 12 }}>
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
                                "Your rating, notes, progress and tracking history for this title will be removed.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Remove", style: "destructive", onPress: remove },
                                ],
                            )
                        }
                    />
                </View>
            )}
        </Animated.ScrollView>
    );
}
