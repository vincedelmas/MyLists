import {useMemo, useState} from "react";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl, View} from "react-native";
import {useTabPush} from "../../hooks/use-tab-push";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {AppText, Field, Page, Select, StateView} from "../../components/ui";
import {MediaCard} from "../../components/media-card";
import {ChoiceChips} from "../../components/choice-chips";
import {mediaJobOptions} from "../../lib/react-query/query-options/media.options";
import type {api} from "../../lib/api-client";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {colors} from "../../theme";

type Input = Parameters<typeof api.mediaJob>[0];

export function MediaJobScreen() {
    const params = useLocalSearchParams<{ mediaType: Input["mediaType"]; job: Input["job"]; name: string }>();
    const focused = useIsFocused();
    const push = useTabPush();
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const [library, setLibrary] = useState<"all" | "in" | "out">("all");
    const [sorting, setSorting] = useState<NonNullable<Input["sorting"]>>("default");
    const query = useInfiniteQuery({
        ...mediaJobOptions({ ...params, search: term || undefined, library: library === "all" ? undefined : library, sorting }),
        enabled: focused && term === search.trim()
    });
    const items = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
    return <Page title={params.name} back><FlatList data={items} numColumns={2} initialNumToRender={8} windowSize={7} contentContainerStyle={{ padding: 10, paddingBottom: 32 }}
                                                    keyExtractor={item => String(item.mediaId)} keyboardShouldPersistTaps="handled"
                                                    ListHeaderComponent={<View style={{ padding: 6, gap: 16, paddingBottom: 16 }}><AppText
                                                        muted>{query.data?.pages[0].total ?? "…"} titles</AppText><Field clearable label="Search titles" value={search}
                                                                                                                         onChangeText={setSearch} autoCorrect={false}/><ChoiceChips
                                                        label="Library" value={library} options={[{ value: "all", label: "All titles" }, { value: "in", label: "In your list" }, {
                                                        value: "out",
                                                        label: "Not in your list"
                                                    }]} onChange={setLibrary}/><Select label="Sort" value={sorting} options={[{
                                                        value: "default",
                                                        label: "Default"
                                                    }, ...getMediaSortOptions([params.mediaType], false)]} onChange={setSorting}/></View>}
                                                    renderItem={({ item }) => <MediaCard name={item.mediaName} cover={item.imageCover}
                                                                                         detail={[item.releaseDate ? String(item.releaseDate).slice(0, 4) : null, item.inUserList ? "In your list" : null].filter(Boolean).join(" · ")}
                                                                                         onPress={() => push({
                                                                                             pathname: "/media/[mediaType]/[mediaId]",
                                                                                             params: { mediaType: params.mediaType, mediaId: item.mediaId }
                                                                                         })}/>}
                                                    refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching && !query.isFetchingNextPage}
                                                                                    onRefresh={() => void query.refetch()}/>}
                                                    onEndReached={() => {
                                                        if (focused && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage();
                                                    }} onEndReachedThreshold={0.5}
                                                    ListEmptyComponent={<StateView loading={query.isPending || term !== search.trim()}
                                                                                   title={query.error ? "Couldn’t load titles" : "No matching titles"}
                                                                                   message={query.error?.message} retry={query.error ? () => void query.refetch() : undefined}/>}
                                                    ListFooterComponent={query.isFetchingNextPage ? <StateView loading/> : query.isError && items.length ?
                                                        <StateView title="Couldn’t load more titles" retry={() => void query.fetchNextPage()}/> : undefined}/></Page>;
}
