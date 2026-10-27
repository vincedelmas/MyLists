import {useMemo} from "react";
import {useIsFocused} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, Pressable, View} from "react-native";
import {Trash2} from "lucide-react-native";
import type {MediaParams, MobileMedia} from "../../lib/api-client";
import {mediaHistoryOptions} from "../../lib/react-query/query-options/media.options";
import {AppText, QueryPanel, StateView} from "../../components/ui";
import {ActionSheet} from "../../components/action-sheet";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useFeedDeletion} from "../profile/use-feed-deletion";
import {formatActivity} from "../profile/profile-formatting";
import {formatDate} from "@/lib/utils/formatting/date";
import {colors} from "../../theme";

export function MediaHistorySheet({ params, data, dismiss }: { params: MediaParams; data: MobileMedia; dismiss: () => void }) {
    const focused = useIsFocused();
    const query = useInfiniteQuery({ ...mediaHistoryOptions(params), enabled: focused });
    const items = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
    const { deleteUpdate, confirmationProps } = useFeedDeletion(params);
    if (confirmationProps.confirmation) return <ConfirmationSheet {...confirmationProps}/>;
    return <ActionSheet title="Tracking history" dismiss={dismiss} scrollable={false}><QueryPanel query={query}>{() => <FlatList data={items}
                                                                                                                                 style={{ maxHeight: 390, flexShrink: 1 }}
                                                                                                                                 initialNumToRender={8} onEndReachedThreshold={0.5}
                                                                                                                                 onEndReached={() => {
                                                                                                                                     if (focused && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage();
                                                                                                                                 }} ListFooterComponent={query.isFetchingNextPage ?
        <StateView loading/> : query.isError && items.length ? <StateView title="Couldn’t load more history" retry={() => void query.fetchNextPage()}/> : undefined}
                                                                                                                                 keyExtractor={item => String(item.id)}
                                                                                                                                 ListEmptyComponent={<StateView
                                                                                                                                     title="No history to display"/>}
                                                                                                                                 renderItem={({ item }) => <View style={{
                                                                                                                                     flexDirection: "row",
                                                                                                                                     alignItems: "center",
                                                                                                                                     gap: 12,
                                                                                                                                     borderBottomWidth: 1,
                                                                                                                                     borderColor: colors.border,
                                                                                                                                     paddingVertical: 16
                                                                                                                                 }}>
                                                                                                                                     <View style={{ flex: 1, gap: 8 }}><AppText
                                                                                                                                         style={{
                                                                                                                                             fontSize: 14,
                                                                                                                                             lineHeight: 21
                                                                                                                                         }}>{formatActivity(item, data.ratingSystem)}</AppText><AppText
                                                                                                                                         muted
                                                                                                                                         style={{ fontSize: 11 }}>{formatDate(item.timestamp)}</AppText></View>
                                                                                                                                     <Pressable accessibilityRole="button"
                                                                                                                                                accessibilityLabel="Delete this update"
                                                                                                                                                onPress={() => deleteUpdate(item.id)}
                                                                                                                                                style={{
                                                                                                                                                    width: 48,
                                                                                                                                                    height: 48,
                                                                                                                                                    justifyContent: "center",
                                                                                                                                                    alignItems: "center"
                                                                                                                                                }}><Trash2 size={18}
                                                                                                                                                           color={colors.error}/></Pressable>
                                                                                                                                 </View>}/>}</QueryPanel></ActionSheet>;
}
