import { useProfileScroll } from "../../hooks/use-profile-scroll";
import { useState } from "react";
import { View } from "react-native";
import { LayoutToggle, type MediaLayout } from "../../components/layout-toggle";
import { useIsFocused } from "expo-router";
import { colors } from "../../theme";
import { useTabPush } from "../../hooks/use-tab-push";
import { formatActivity } from "./profile-formatting";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AppText, StateView } from "../../components/ui";
import { Animated, RefreshControl } from "react-native";
import { MediaCard } from "../../components/media-card";
import { historyOptions } from "../../lib/react-query/query-options/history.options";

export function ActivityContent() {
    const push = useTabPush();
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useProfileScroll();
    const [layout, setLayout] = useState<MediaLayout>("grid");
    const query = useInfiniteQuery({ ...historyOptions, enabled: focused });
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <>
            <Animated.FlatList
                key={layout}
                {...scrollProps}
                ListHeaderComponent={
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 16,
                            paddingTop: 8,
                        }}
                    >
                        <AppText muted style={{ fontSize: 12 }}>
                            Your tracking history
                        </AppText>
                        <LayoutToggle value={layout} onChange={setLayout} />
                    </View>
                }
                data={items}
                numColumns={layout === "grid" ? 2 : 1}
                contentContainerStyle={[{ padding: 10 }, contentContainerStyle]}
                windowSize={7}
                initialNumToRender={15}
                onEndReachedThreshold={0.5}
                keyExtractor={(item) => String(item.id)}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) {
                        void query.fetchNextPage();
                    }
                }}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        onRefresh={() => void query.refetch()}
                        refreshing={query.isRefetching && !query.isFetchingNextPage}
                    />
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.isError ? "Couldn’t load activity" : "No activity yet"}
                        retry={query.isError ? () => void query.refetch() : undefined}
                        message={query.error?.message ?? "Your tracking updates will appear here."}
                    />
                }
                renderItem={({ item }) => (
                    <MediaCard
                        layout={layout}
                        name={item.mediaName}
                        cover={item.cover}
                        detail={formatActivity(item, query.data!.pages[0].ratingSystem)}
                        onPress={() =>
                            push({
                                pathname: "/media/[mediaType]/[mediaId]",
                                params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                            })
                        }
                    >
                        <AppText muted style={{ fontSize: 10 }}>
                            {new Date(item.timestamp).toLocaleString()}
                        </AppText>
                    </MediaCard>
                )}
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading={true} />
                    ) : query.isError && items.length ? (
                        <StateView title="Couldn’t load more activity" retry={() => void query.fetchNextPage()} />
                    ) : undefined
                }
            />
        </>
    );
}
