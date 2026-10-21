import {useTabPush} from "../../lib/use-tab-push";
import {useState} from "react";
import {useIsFocused} from "expo-router";
import {FlatList, View} from "react-native";
import {mediaLabels} from "../../lib/media";
import {MediaRow} from "../../components/MediaRow";
import {useInfiniteQuery} from "@tanstack/react-query";
import {useDebouncedValue} from "../../lib/use-debounced-value";
import type {SearchInput, SearchResult} from "../../lib/api-client";
import {AppText, Field, Page, Select, StateView} from "../../components/ui";
import {searchOptions} from "../../lib/react-query/query-options/search.options";
import {useResolveMutation} from "../../lib/react-query/query-mutations/media.mutations";

const providers = [
    {value: "tmdb", label: "Movies & TV"},
    {value: "igdb", label: "Games"},
    {value: "books", label: "Books"},
    {value: "manga", label: "Manga"},
] as const;

export function SearchScreen() {
    const push = useTabPush();
    const [text, setText] = useState("");
    const [provider, setProvider] = useState<SearchInput["apiProvider"]>("tmdb");
    const term = useDebouncedValue(text.trim());
    const focused = useIsFocused();
    const query = useInfiniteQuery({...searchOptions(term, provider), enabled: focused && term.length >= 2});
    const resolve = useResolveMutation();
    const results = query.data?.pages.flatMap((page) => page.data) ?? [];
    const open = (item: SearchResult["data"][number]) => {
        if (item.itemType === "users" || resolve.isPending) return;
        const mediaType = item.itemType;
        const navigate = (mediaId: number) =>
            push({pathname: "/media/[mediaType]/[mediaId]", params: {mediaType, mediaId: String(mediaId)}});
        if ("mediaId" in item && item.mediaId) navigate(item.mediaId);
        else resolve.mutate({mediaType, apiId: item.id}, {onSuccess: (data) => navigate(data.mediaId)});
    };
    return (
        <Page title="Search" subtitle="Find your next movie, show, book, or game">
            <View style={{padding: 16, gap: 12}}>
                <Field
                    label="Search"
                    value={text}
                    onChangeText={setText}
                    placeholder="Search titles…"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                <Select
                    label="Search in"
                    value={provider}
                    options={providers}
                    onChange={(value) => {
                        setProvider(value);
                        resolve.reset();
                    }}
                />
                {resolve.isPending && <AppText muted>Opening media details…</AppText>}
                {resolve.error && <AppText accessibilityRole="alert">{resolve.error.message}</AppText>}
            </View>
            <FlatList
                key={`${provider}:${term}`}
                data={results}
                keyExtractor={(item) => `${item.itemType}:${item.id}`}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={10}
                windowSize={7}
                renderItem={({item}) =>
                    item.itemType === "users" ? null : (
                        <MediaRow
                            mediaType={item.itemType}
                            name={item.name}
                            cover={item.image}
                            detail={`${mediaLabels[item.itemType]}${item.date ? ` · ${typeof item.date === "number" && item.date > 9999 ? new Date(item.date * 1000).getUTCFullYear() : String(item.date).slice(0, 4)}` : ""}${"inCurrentUserList" in item && item.inCurrentUserList ? " · In your list" : ""}`}
                            onPress={() => open(item)}
                        />
                    )
                }
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
                }}
                ListEmptyComponent={
                    <StateView
                        loading={term.length >= 2 && query.isPending}
                        title={
                            term.length < 2
                                ? "Find something to track"
                                : query.isError
                                  ? "Search unavailable"
                                  : "No results"
                        }
                        message={
                            query.error?.message ??
                            (term.length < 2
                                ? "Enter at least two characters to search."
                                : "Try a different title or search provider.")
                        }
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading />
                    ) : query.isError && results.length ? (
                        <StateView
                            title="Couldn’t load more results"
                            message={query.error.message}
                            retry={() => void query.fetchNextPage()}
                        />
                    ) : undefined
                }
            />
        </Page>
    );
}
