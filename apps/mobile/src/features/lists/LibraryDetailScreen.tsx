import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl} from "react-native";
import {Page, StateView} from "../../components/ui";
import {MediaRow} from "../../components/MediaRow";
import {libraryDetailOptions} from "../../lib/react-query/query-options/library.options";
import {colors} from "../../theme";

export function LibraryDetailScreen() {
    const {kind, id} = useLocalSearchParams<{kind: "collection" | "dynamic" | "continue"; id?: string}>();
    const focused = useIsFocused();
    const query = useInfiniteQuery({...libraryDetailOptions(kind, id ? Number(id) : undefined), enabled: focused});
    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    return (
        <Page title={first?.title ?? (kind === "continue" ? "Continue" : "List")} back>
            <FlatList
                data={items}
                keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
                initialNumToRender={10}
                windowSize={7}
                renderItem={({item}) => (
                    <MediaRow
                        mediaType={item.mediaType}
                        mediaId={item.mediaId}
                        name={item.name}
                        cover={item.cover}
                        status={item.status ?? undefined}
                        rating={item.rating}
                        favorite={item.favorite}
                        ratingSystem={first?.ratingSystem}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={query.isRefetching && !query.isFetchingNextPage}
                        onRefresh={() => void query.refetch()}
                        tintColor={colors.accent}
                    />
                }
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
                }}
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.isError ? "Couldn’t load this list" : "No titles here yet"}
                        message={query.error?.message}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading />
                    ) : query.isError && items.length ? (
                        <StateView title="Couldn’t load more" retry={() => void query.fetchNextPage()} />
                    ) : undefined
                }
            />
        </Page>
    );
}
