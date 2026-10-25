import {useState} from "react";
import {colors} from "../../theme";
import {MediaListDetails} from "../../components/media-list-details";
import {useTabPush} from "../../hooks/use-tab-push";
import {Page, StateView} from "../../components/ui";
import {MediaCard} from "../../components/media-card";
import {FlatList, RefreshControl} from "react-native";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {LayoutToggle, type MediaLayout} from "../../components/layout-toggle";
import {libraryDetailOptions} from "../../lib/react-query/query-options/library.options";


export function LibraryDetailScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const [layout, setLayout] = useState<MediaLayout>("grid");
    const { kind, id, userId } = useLocalSearchParams<{ kind: "collection" | "dynamic" | "continue"; id?: string; userId?: string }>();
    const query = useInfiniteQuery({
        ...libraryDetailOptions(kind, id ? Number(id) : undefined, userId ? Number(userId) : undefined),
        enabled: focused,
    });

    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <Page
            back={true}
            action={<LayoutToggle value={layout} onChange={setLayout}/>}
            title={first?.title ?? (kind === "continue" ? "Continue" : "List")}
        >
            <FlatList
                key={layout}
                data={items}
                windowSize={7}
                initialNumToRender={10}
                onEndReachedThreshold={0.5}
                numColumns={layout === "grid" ? 2 : 1}
                contentContainerStyle={{ padding: 10 }}
                keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
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
                        message={query.error?.message}
                        title={query.isError ? "Couldn’t load this list" : "No titles here yet"}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                renderItem={({ item }) => (
                    <MediaCard
                        layout={layout}
                        name={item.name}
                        cover={item.cover}
                        onPress={() =>
                            push({
                                pathname: "/media/[mediaType]/[mediaId]",
                                params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                            })
                        }
                    >
                        <MediaListDetails
                            status={item.status}
                            rating={item.rating}
                            favorite={item.favorite}
                            hasComment={item.hasComment}
                            ratingSystem={first?.ratingSystem ?? "score"}
                        />
                    </MediaCard>
                )}

                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading={true}/>
                    ) : query.isError && items.length ? (
                        <StateView title="Couldn’t load more" retry={() => void query.fetchNextPage()}/>
                    ) : undefined
                }
            />
        </Page>
    );
}
