import {useEffect, useRef, useState} from "react";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl, View} from "react-native";
import {Search} from "lucide-react-native";
import {AppText, Button, Field, Page, StateView} from "../../components/ui";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {colors} from "../../theme";
import {historyOptions} from "../../lib/react-query/query-options/history.options";
import {FeedRows} from "./ProfileFeed";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useFeedDeletion} from "./use-feed-deletion";

export function FeedScreen() {
    const { userId } = useLocalSearchParams<{ userId?: string }>();
    const focused = useIsFocused();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const searching = term !== search.trim();
    const list = useRef<FlatList>(null);
    const query = useQuery({ ...historyOptions(page, term, userId ? Number(userId) : undefined), enabled: focused && !searching });
    const { deleteUpdate, confirmationProps } = useFeedDeletion();
    const pages = Math.max(1, query.data?.pages ?? page);
    useEffect(() => {
        // A deletion or external refetch can remove the last page without a pagination button press.
        // oxlint-disable-next-line react-you-might-not-need-an-effect/no-event-handler, react-you-might-not-need-an-effect/no-chain-state-updates
        if (query.data && page > pages) setPage(pages);
    }, [page, pages, query.data]);
    const changePage = (value: number) => {
        setPage(value);
        list.current?.scrollToOffset({ offset: 0, animated: false });
    };
    return <Page title="Feed" back subtitle="Tracking history">
        <View style={{ padding: 16, gap: 10 }}><Field label="Search feed" hideLabel clearable leadingIcon={<Search size={19} color={colors.muted}/>} value={search}
                                                      onChangeText={value => {
                                                          setSearch(value);
                                                          changePage(1);
                                                      }} placeholder="Search media in your feed…" autoCorrect={false} returnKeyType="search"/>
            <AppText muted
                     style={{ fontSize: 12 }}>{searching ? "Searching…" : query.data ? `${query.data.total} updates${term ? ` matching “${term}”` : ""}` : "Tracking updates"}</AppText>
        </View>
        <FlatList ref={list} data={searching ? [] : query.data?.items ?? []} keyExtractor={item => String(item.id)} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5}
                  keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 24 }}
                  renderItem={({ item }) => <FeedRows items={[item]} ratingSystem={query.data!.ratingSystem} onDelete={!userId ? deleteUpdate : undefined}/>}
                  refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}/>}
                  ListEmptyComponent={<StateView loading={query.isPending || searching}
                                                 title={query.error ? "Couldn’t load feed" : term ? "No matching updates" : "No activity yet"}
                                                 message={query.error?.message ?? (term ? "Try another media title." : "Tracking updates will appear here.")}
                                                 retry={query.error ? () => void query.refetch() : undefined}/>}
                  ListFooterComponent={query.error && query.data?.items.length ? <StateView title="Couldn’t refresh feed" retry={() => void query.refetch()}/> : undefined}/>
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Button secondary label="Previous" disabled={page <= 1 || searching || query.isPending} onPress={() => changePage(page - 1)}/><AppText accessibilityLiveRegion="polite"
                                                                                                                                                   style={{
                                                                                                                                                       fontSize: 12,
                                                                                                                                                       fontVariant: ["tabular-nums"]
                                                                                                                                                   }}>{query.data ? `${page} / ${pages}` : `Page ${page}`}</AppText><Button
            secondary label="Next" disabled={!query.data || page >= pages || searching || query.isPending} onPress={() => changePage(page + 1)}/>
        </View>
        <ConfirmationSheet {...confirmationProps}/>
    </Page>;
}
