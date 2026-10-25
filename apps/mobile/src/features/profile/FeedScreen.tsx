import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl} from "react-native";
import {Page, StateView} from "../../components/ui";
import {colors} from "../../theme";
import {historyOptions} from "../../lib/react-query/query-options/history.options";
import {FeedRows} from "./ProfileFeed";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useFeedDeletion} from "./use-feed-deletion";

export function FeedScreen() {
    const { userId } = useLocalSearchParams<{ userId?: string }>();
    const focused = useIsFocused();
    const query = useInfiniteQuery({ ...historyOptions(userId ? Number(userId) : undefined), enabled: focused });
    const { deleteUpdate, confirmationProps } = useFeedDeletion();
    const items = query.data?.pages.flatMap(page => page.items) ?? [];

    return (
        <Page title="Feed" back subtitle="Tracking history">
            <FlatList
                data={items}
                keyExtractor={item => String(item.id)}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                renderItem={({ item }) => <FeedRows items={[item]} ratingSystem={query.data!.pages[0].ratingSystem} onDelete={!userId ? deleteUpdate : undefined}/>}
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
                }}
                refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()}/>}
                ListEmptyComponent={<StateView loading={query.isPending} title={query.error ? "Couldn’t load feed" : "No activity yet"}
                                               message={query.error?.message ?? "Tracking updates will appear here."}
                                               retry={query.error ? () => void query.refetch() : undefined}/>}
                ListFooterComponent={query.isFetchingNextPage ? <StateView loading/> : items.length && query.error ?
                    <StateView title="Couldn’t load more updates" retry={() => void query.fetchNextPage()}/> : undefined}
            />
            <ConfirmationSheet {...confirmationProps}/>
        </Page>
    );
}
