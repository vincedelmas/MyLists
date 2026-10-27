import {useIsFocused} from "expo-router";
import {FlatList, RefreshControl} from "react-native";
import type {ReactNode} from "react";
import type {MediaType} from "../lib/api-client";
import type {MediaLayout} from "./layout-toggle";
import {useTabPush} from "../hooks/use-tab-push";
import {MediaCard} from "./media-card";
import {MediaListDetails} from "./media-list-details";
import {StateView} from "./ui";
import {colors} from "../theme";


interface MediaListItem {
    mediaId: number;
    mediaType: MediaType;
    name: string;
    cover: string | null;
    status: string | null;
    rating: number | null;
    favorite: boolean | null;
    hasComment: boolean;
}


interface MediaListProps<T extends MediaListItem> {
    items: T[];
    onItemLongPress?: (item: T) => void;
    layout: MediaLayout;
    ratingSystem: "score" | "feeling";
    emptyTitle: string;
    emptyMessage?: string;
    footer?: ReactNode;
    query: {
        isPending: boolean;
        isRefetching: boolean;
        isFetchingNextPage: boolean;
        isFetching: boolean;
        hasNextPage: boolean;
        error: Error | null;
        refetch: () => unknown;
        fetchNextPage: () => unknown;
    };
}


export function MediaList<T extends MediaListItem>({ items, layout, ratingSystem, emptyTitle, emptyMessage, footer, query, onItemLongPress }: MediaListProps<T>) {
    const focused = useIsFocused();
    const push = useTabPush();

    return (
        <FlatList
            key={layout}
            data={items}
            windowSize={7}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            onEndReachedThreshold={0.5}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            numColumns={layout === "grid" ? 2 : 1}
            contentContainerStyle={{ padding: 10 }}
            keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
            onEndReached={() => {
                if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
            }}
            refreshControl={
                <RefreshControl
                    tintColor={colors.accent}
                    refreshing={query.isRefetching && !query.isFetchingNextPage}
                    onRefresh={() => void query.refetch()}
                />
            }
            ListEmptyComponent={
                <StateView
                    loading={query.isPending}
                    title={query.error ? "Couldn’t load this list" : emptyTitle}
                    message={query.error?.message ?? emptyMessage}
                    retry={query.error ? () => void query.refetch() : undefined}
                />
            }
            renderItem={({ item }) => (
                <MediaCard
                    layout={layout}
                    name={item.name}
                    cover={item.cover}
                    onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
                    onPress={() => push({
                        pathname: "/media/[mediaType]/[mediaId]",
                        params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                    })}
                >
                    <MediaListDetails
                        {...item}
                        ratingSystem={ratingSystem}
                    />
                </MediaCard>
            )
            }
            ListFooterComponent={query.isFetchingNextPage
                ? <StateView loading/>
                : query.error && items.length
                    ? <StateView
                        title="Couldn’t load more"
                        message={query.error.message}
                        retry={() => void (query.hasNextPage ? query.fetchNextPage() : query.refetch())}
                    />
                    : <>
                        {footer}
                    </>
            }
        />
    );
}
