import {colors} from "../../theme";
import {MediaRow} from "../../components/MediaRow";
import {Page, StateView} from "../../components/ui";
import {FlatList, RefreshControl} from "react-native";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {libraryDetailOptions} from "../../lib/react-query/query-options/library.options";


export function LibraryDetailScreen() {
    const focused = useIsFocused();
    const { kind, id } = useLocalSearchParams<{ kind: "collection" | "dynamic" | "continue"; id?: string }>();
    const query = useInfiniteQuery({ ...libraryDetailOptions(kind, id ? Number(id) : undefined), enabled: focused });

    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <Page title={first?.title ?? (kind === "continue" ? "Continue" : "List")} back>
            <FlatList
                data={items}
                windowSize={7}
                initialNumToRender={10}
                onEndReachedThreshold={0.5}
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
                renderItem={({ item }) =>
                    <MediaRow
                        name={item.name}
                        cover={item.cover}
                        rating={item.rating}
                        mediaId={item.mediaId}
                        favorite={item.favorite}
                        mediaType={item.mediaType}
                        status={item.status ?? undefined}
                        ratingSystem={first?.ratingSystem}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ?
                        <StateView
                            loading={true}
                        />
                        :
                        query.isError && items.length ?
                            <StateView
                                title="Couldn’t load more"
                                retry={() => void query.fetchNextPage()}
                            />
                            :
                            undefined
                }
            />
        </Page>
    );
}
