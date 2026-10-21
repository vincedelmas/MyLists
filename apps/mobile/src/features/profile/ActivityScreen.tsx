import {useTabPush} from "../../lib/use-tab-push";
import {useIsFocused} from "expo-router";
import {FlatList, RefreshControl, Pressable, View} from "react-native";
import {useInfiniteQuery} from "@tanstack/react-query";
import {AppText, Page, StateView} from "../../components/ui";
import {historyOptions} from "../../lib/react-query/query-options/history.options";
import {colors, mediaColors} from "../../theme";
import {formatActivity} from "./profile-formatting";

export function ActivityScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const query = useInfiniteQuery({...historyOptions, enabled: focused});
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    return (
        <Page title="Recent feed" back>
            <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                windowSize={7}
                initialNumToRender={15}
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
                renderItem={({item}) => (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                            push({
                                pathname: "/media/[mediaType]/[mediaId]",
                                params: {mediaType: item.mediaType, mediaId: String(item.mediaId)},
                            })
                        }
                        style={{padding: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border}}
                    >
                        <View style={{flexDirection: "row", gap: 8, alignItems: "center"}}>
                            <View
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: mediaColors[item.mediaType],
                                }}
                            />
                            <AppText style={{flex: 1, fontWeight: "600"}}>{item.mediaName}</AppText>
                        </View>
                        <AppText muted>{formatActivity(item, query.data!.pages[0].ratingSystem)}</AppText>
                        <AppText muted style={{fontSize: 11}}>
                            {new Date(item.timestamp).toLocaleString()}
                        </AppText>
                    </Pressable>
                )}
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.isError ? "Couldn’t load activity" : "No activity yet"}
                        message={query.error?.message ?? "Your tracking updates will appear here."}
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
        </Page>
    );
}
