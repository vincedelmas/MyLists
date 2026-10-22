import { useState } from "react";
import { useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Animated, FlatList, Linking, Pressable, RefreshControl, View } from "react-native";
import { AppText, Button, Cover, MenuRow, QueryPanel, Section } from "../../components/ui";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { useTabPush } from "../../hooks/use-tab-push";
import { mediaDetailsOptions } from "../../lib/react-query/query-options/media.options";
import { useMediaRefreshMutation } from "../../lib/react-query/query-mutations/media.mutations";
import type { MediaParams, MobileMedia } from "../../lib/api-client";
import { colors } from "../../theme";

export function MediaDetailsContent({
    params,
    data,
    refetch,
    refreshing,
}: {
    params: MediaParams;
    data: MobileMedia;
    refetch: () => unknown;
    refreshing: boolean;
}) {
    const focused = useIsFocused();
    const [expanded, setExpanded] = useState(false);
    const query = useQuery({ ...mediaDetailsOptions(params), enabled: focused });
    const refresh = useMediaRefreshMutation(params);
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    const upcoming = data.media.nextEpisode?.date;
    return (
        <Animated.ScrollView
            {...scrollProps}
            contentContainerStyle={[{ padding: 16, gap: 24 }, contentContainerStyle]}
            refreshControl={
                <RefreshControl
                    tintColor={colors.accent}
                    refreshing={refreshing || query.isRefetching}
                    onRefresh={() => {
                        refetch();
                        void query.refetch();
                    }}
                />
            }
        >
            {data.media.synopsis && (
                <View style={{ gap: 10 }}>
                    {data.media.tagline && (
                        <AppText muted style={{ fontSize: 11, letterSpacing: 1 }}>
                            {data.media.tagline.toUpperCase()}
                        </AppText>
                    )}
                    <AppText numberOfLines={expanded ? undefined : 5} style={{ fontSize: 14, lineHeight: 23 }}>
                        {data.media.synopsis}
                    </AppText>
                    {data.media.synopsis.length > 240 && (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded }}
                            onPress={() => setExpanded(!expanded)}
                            style={{ minHeight: 44, justifyContent: "center" }}
                        >
                            <AppText style={{ color: colors.accent, fontSize: 12 }}>
                                {expanded ? "Show less" : "Read more"}
                            </AppText>
                        </Pressable>
                    )}
                </View>
            )}
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                }}
            >
                <View style={{ gap: 4 }}>
                    <AppText muted style={{ fontSize: 11 }}>
                        {upcoming ? "Next episode" : "Released"}
                    </AppText>
                    <AppText style={{ fontSize: 13 }}>
                        {upcoming ?? data.media.releaseDate ?? "To be announced"}
                    </AppText>
                    {upcoming && (
                        <AppText muted style={{ fontSize: 12 }}>
                            S{data.media.nextEpisode?.season} · E{data.media.nextEpisode?.episode}
                        </AppText>
                    )}
                </View>
                {data.media.provider.url && (
                    <Button
                        secondary
                        label={data.media.provider.name}
                        onPress={() => void Linking.openURL(data.media.provider.url!)}
                    />
                )}
            </View>
            <Section title="About this title">
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {data.media.facts
                        .filter((fact) => !["Provider score", "Votes", "Runtime (minutes)"].includes(fact.label))
                        .map((fact) => (
                            <View key={fact.label} style={{ flexBasis: "50%", padding: 14, gap: 4 }}>
                                <AppText muted style={{ fontSize: 11 }}>
                                    {fact.label}
                                </AppText>
                                <AppText style={{ fontSize: 13 }}>{fact.value}</AppText>
                            </View>
                        ))}
                </View>
            </Section>
            <QueryPanel query={query}>
                {(details) => (
                    <>
                        {details.genres.length > 0 && (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                {details.genres.map((genre) => (
                                    <AppText
                                        key={genre.name}
                                        style={{
                                            fontSize: 12,
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 16,
                                            backgroundColor: colors.secondary,
                                        }}
                                    >
                                        {genre.name}
                                    </AppText>
                                ))}
                            </View>
                        )}
                        {(
                            [
                                { label: "Authors", items: details.authors },
                                { label: "Cast", items: details.actors },
                                { label: "Companies", items: details.companies },
                                { label: "Platforms", items: details.platforms },
                                { label: "Networks", items: details.networks },
                            ] as const
                        )
                            .filter(({ items }) => items.length)
                            .map(({ label, items }) => (
                                <Section key={label} title={label}>
                                    <View style={{ padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                                        {items.map((item) => (
                                            <View
                                                key={item.name}
                                                style={{
                                                    flexBasis: "46%",
                                                    flexGrow: 1,
                                                    gap: 8,
                                                    padding: 10,
                                                    borderRadius: 8,
                                                    backgroundColor: colors.secondary,
                                                }}
                                            >
                                                <AppText style={{ fontSize: 13 }}>{item.name}</AppText>
                                            </View>
                                        ))}
                                    </View>
                                </Section>
                            ))}
                        {details.similar.length > 0 && (
                            <View style={{ gap: 12 }}>
                                <AppText heading style={{ fontSize: 18 }}>
                                    Similar titles
                                </AppText>
                                <FlatList
                                    horizontal
                                    data={details.similar}
                                    keyExtractor={(item) => String(item.mediaId)}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 12 }}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={item.mediaName}
                                            onPress={() =>
                                                push({
                                                    pathname: "/media/[mediaType]/[mediaId]",
                                                    params: {
                                                        mediaType: params.mediaType,
                                                        mediaId: String(item.mediaId),
                                                    },
                                                })
                                            }
                                            style={{ width: 108, gap: 8 }}
                                        >
                                            <Cover
                                                uri={item.mediaCover}
                                                style={{ width: 108, height: undefined, aspectRatio: 0.67 }}
                                            />
                                            <AppText numberOfLines={2} style={{ fontSize: 12 }}>
                                                {item.mediaName}
                                            </AppText>
                                        </Pressable>
                                    )}
                                />
                            </View>
                        )}
                        {details.collections.length > 0 && (
                            <Section title="Popular collections">
                                {details.collections.map((collection) => (
                                    <MenuRow
                                        key={collection.id}
                                        title={collection.title}
                                        detail={`${collection.itemsCount} titles · ${collection.likeCount} likes · ${collection.ownerName}`}
                                        onPress={() =>
                                            push({
                                                pathname: "/library/[kind]",
                                                params: { kind: "collection", id: String(collection.id) },
                                            })
                                        }
                                    />
                                ))}
                            </Section>
                        )}
                    </>
                )}
            </QueryPanel>
            <Section title="Metadata">
                <View style={{ padding: 16, gap: 12 }}>
                    <AppText muted style={{ fontSize: 12 }}>
                        Update this title from {data.media.provider.name}.
                    </AppText>
                    <Button
                        secondary
                        label="Refresh metadata"
                        pending={refresh.isPending}
                        disabled={!data.refresh.allowed}
                        onPress={() => refresh.mutate()}
                    />
                    {data.refresh.reason && (
                        <AppText muted style={{ fontSize: 12 }}>
                            {data.refresh.reason}
                            {data.refresh.nextAllowedAt
                                ? ` Available ${new Date(data.refresh.nextAllowedAt).toLocaleString()}.`
                                : ""}
                        </AppText>
                    )}
                    {refresh.error && (
                        <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                            {refresh.error.message}
                        </AppText>
                    )}
                    {refresh.isSuccess && <AppText accessibilityRole="alert">Metadata refreshed.</AppText>}
                </View>
            </Section>
        </Animated.ScrollView>
    );
}
