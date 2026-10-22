import { useIsFocused } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Animated, Pressable, RefreshControl, View } from "react-native";
import { AppText, Cover, StateView } from "../../components/ui";
import { mediaCommunityOptions } from "../../lib/react-query/query-options/media.options";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { useTabPush } from "../../hooks/use-tab-push";
import type { api, MediaParams } from "../../lib/api-client";
import { ratingLabel } from "../../lib/ratings";
import { colors } from "../../theme";

type Person = Awaited<ReturnType<typeof api.mediaCommunity>>["items"][number];
function ActivityPerson({ item }: { item: Person }) {
    const push = useTabPush();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}'s profile`}
            onPress={() => push({ pathname: "/people/[userId]", params: { userId: String(item.id) } })}
            style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
            }}
        >
            <Cover uri={item.image} label={item.name} style={{ width: 42, height: 42, borderRadius: 21 }} />
            <View style={{ flex: 1, gap: 4 }}>
                <AppText style={{ fontWeight: "600" }}>{item.name}</AppText>
                <AppText muted style={{ fontSize: 12 }}>
                    {item.status}
                    {item.favorite ? " · Favorite" : ""}
                </AppText>
            </View>
            {item.rating != null && (
                <AppText style={{ color: colors.rating }}>{ratingLabel(item.rating, item.ratingSystem)}</AppText>
            )}
        </Pressable>
    );
}
export function MediaCommunityContent({ params }: { params: MediaParams }) {
    const focused = useIsFocused();
    const query = useInfiniteQuery({ ...mediaCommunityOptions(params), enabled: focused });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    return (
        <Animated.FlatList
            {...scrollProps}
            data={items}
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
                if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
            }}
            ListHeaderComponent={
                <View style={{ gap: 16, paddingTop: 4 }}>
                    <AppText heading style={{ fontSize: 18, paddingHorizontal: 16 }}>
                        People you follow
                    </AppText>
                    {first &&
                        (first.follows.length ? (
                            first.follows.map((item) => <ActivityPerson key={item.id} item={item} />)
                        ) : (
                            <AppText muted style={{ paddingHorizontal: 16 }}>
                                No followed users tracking this title yet.
                            </AppText>
                        ))}
                    <AppText heading style={{ fontSize: 18, paddingHorizontal: 16 }}>
                        Community activity
                    </AppText>
                    {first && (
                        <AppText muted style={{ paddingHorizontal: 16, fontSize: 12 }}>
                            {first.total} tracking · {first.stats.completedCount} completed · {first.stats.likedCount}{" "}
                            favorites
                            {first.stats.averageRating != null
                                ? ` · ${first.stats.averageRating.toFixed(1)} average`
                                : ""}
                        </AppText>
                    )}
                </View>
            }
            renderItem={({ item }) => <ActivityPerson item={item} />}
            ListEmptyComponent={
                <StateView
                    loading={query.isPending}
                    title={query.isError ? "Couldn’t load activity" : "No community activity yet"}
                    message={query.error?.message}
                    retry={query.isError ? () => void query.refetch() : undefined}
                />
            }
            ListFooterComponent={
                query.isFetchingNextPage ? (
                    <StateView loading />
                ) : query.isError && items.length ? (
                    <StateView title="Couldn’t load more activity" retry={() => void query.fetchNextPage()} />
                ) : undefined
            }
        />
    );
}
