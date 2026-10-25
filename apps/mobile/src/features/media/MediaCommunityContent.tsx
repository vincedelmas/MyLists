import {useIsFocused} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {Animated, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {AppText, Cover, StateView} from "../../components/ui";
import {mediaCommunityOptions} from "../../lib/react-query/query-options/media.options";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {useTabPush} from "../../hooks/use-tab-push";
import type {api, MediaParams} from "../../lib/api-client";
import {Rating} from "../../components/rating";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {colors} from "../../theme";

type Person = Awaited<ReturnType<typeof api.mediaCommunity>>["items"][number];

function ActivityPerson({ item }: { item: Person }) {
    const push = useTabPush();
    const progress = [
        item.progress.season != null ? `S${item.progress.season} · E${item.progress.episode}` : null,
        item.progress.playtimeMinutes != null ? formatMinutes(item.progress.playtimeMinutes) : null,
        item.progress.pages != null ? `Page ${item.progress.pages}` : null,
        item.progress.chapters != null ? `Chapter ${item.progress.chapters}` : null,
        item.progress.repeats ? `${item.progress.repeats} repeats` : null,
        item.progress.platform,
    ]
        .filter(Boolean)
        .join(" · ");
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}'s profile`}
            onPress={() => push({ pathname: "/people/[userId]", params: { userId: String(item.id) } })}
            style={styles.person}
        >
            <Cover uri={item.image} label={item.name} style={styles.avatar}/>
            <View style={styles.personInfo}>
                <AppText style={styles.personName}>{item.name}</AppText>
                <AppText muted style={styles.smallText}>
                    {item.status}
                    {item.favorite ? " · Favorite" : ""}
                </AppText>
                {progress && (
                    <AppText muted style={styles.smallText}>
                        {progress}
                    </AppText>
                )}
                {item.comment && (
                    <AppText numberOfLines={3} style={styles.comment}>
                        {item.comment}
                    </AppText>
                )}
            </View>
            <Rating value={item.rating} system={item.ratingSystem}/>
        </Pressable>
    );
}

export function MediaCommunityContent({
                                          params,
                                          ratingSystem,
                                          mode,
                                      }: {
    params: MediaParams;
    mode: "follows" | "community";
    ratingSystem: "score" | "feeling";
}) {
    const focused = useIsFocused();
    const query = useInfiniteQuery({ ...mediaCommunityOptions(params), enabled: focused });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    const sections =
        mode === "follows"
            ? [{ key: "follows", title: "People you follow", data: first?.follows ?? [] }]
            : [{ key: "community", title: "Community activity", data: items }];
    return (
        <Animated.SectionList
            {...scrollProps}
            sections={sections}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={contentContainerStyle}
            keyExtractor={(item) => String(item.id)}
            initialNumToRender={12}
            windowSize={7}
            refreshControl={
                <RefreshControl
                    tintColor={colors.accent}
                    refreshing={query.isRefetching && !query.isFetchingNextPage}
                    onRefresh={() => void query.refetch()}
                />
            }
            onEndReachedThreshold={0.5}
            onEndReached={() => {
                if (mode === "community" && focused && query.hasNextPage && !query.isFetching)
                    void query.fetchNextPage();
            }}
            renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                    <AppText heading style={styles.sectionTitle}>
                        {section.title}
                    </AppText>
                    {section.key === "follows" && first && !section.data.length && (
                        <AppText muted>No followed users tracking this title yet.</AppText>
                    )}
                    {section.key === "community" && first && (
                        <>
                            <AppText muted style={styles.smallText}>
                                {first.total} tracking · {first.stats.completedCount} completed ·{" "}
                                {first.stats.likedCount} favorites
                            </AppText>
                            {first.stats.averageRating != null && (
                                <Rating value={first.stats.averageRating} system={ratingSystem}/>
                            )}
                        </>
                    )}
                </View>
            )}
            renderItem={({ item }) => <ActivityPerson item={item}/>}
            renderSectionFooter={({ section }) =>
                !first ? (
                    <StateView
                        loading={query.isPending}
                        title="Couldn’t load activity"
                        message={query.error?.message}
                        retry={() => void query.refetch()}
                    />
                ) : section.key === "community" && !items.length ? (
                    <StateView
                        loading={query.isPending}
                        title={query.isError ? "Couldn’t load activity" : "No community activity yet"}
                        message={query.error?.message}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                ) : null
            }
            ListFooterComponent={
                mode === "community" && query.isFetchingNextPage ? (
                    <StateView loading/>
                ) : mode === "community" && query.isError && items.length ? (
                    <StateView title="Couldn’t load more activity" retry={() => void query.fetchNextPage()}/>
                ) : undefined
            }
        />
    );
}

const styles = StyleSheet.create({
    person: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatar: { width: 42, height: 42, borderRadius: 21 },
    personInfo: { flex: 1, gap: 4 },
    personName: { fontWeight: "600" },
    comment: { fontSize: 12, lineHeight: 18 },

    sectionHeader: { gap: 16, padding: 16 },
    sectionTitle: { fontSize: 18 },
    smallText: { fontSize: 12 },
});
