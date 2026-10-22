import {useIsFocused} from "expo-router";
import {colors, mediaColors} from "../../theme";
import {useTabPush} from "../../hooks/use-tab-push";
import {formatActivity} from "./profile-formatting";
import {useInfiniteQuery} from "@tanstack/react-query";
import {AppText, StateView} from "../../components/ui";
import {FlatList, RefreshControl, Pressable, View} from "react-native";
import {historyOptions} from "../../lib/react-query/query-options/history.options";


export function ActivityContent() {
    const push = useTabPush();
    const focused = useIsFocused();
    const query = useInfiniteQuery({ ...historyOptions, enabled: focused });
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <>
            <FlatList
                data={items}
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
                    <Pressable
                        accessibilityRole="button"
                        style={{ padding: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}
                        onPress={() =>
                            push({
                                pathname: "/media/[mediaType]/[mediaId]",
                                params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                            })
                        }
                    >
                        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <View
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: mediaColors[item.mediaType],
                                }}
                            />
                            <AppText style={{ flex: 1, fontWeight: "600" }}>
                                {item.mediaName}
                            </AppText>
                        </View>
                        <AppText muted={true}>
                            {formatActivity(item, query.data!.pages[0].ratingSystem)}
                        </AppText>
                        <AppText muted style={{ fontSize: 11 }}>
                            {new Date(item.timestamp).toLocaleString()}
                        </AppText>
                    </Pressable>
                )}
                ListFooterComponent={
                    query.isFetchingNextPage ?
                        <StateView
                            loading={true}
                        />
                        :
                        query.isError && items.length ?
                            <StateView
                                title="Couldn’t load more activity"
                                retry={() => void query.fetchNextPage()}
                            />
                            :
                            undefined
                }
            />
        </>
    );
}
