import {useIsFocused} from "expo-router";
import {useState} from "react";
import {FlatList, RefreshControl, View} from "react-native";
import {useLocalSearchParams} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {AppText, Button, Field, Page, Select, StateView} from "../../components/ui";
import {MediaRow} from "../../components/MediaRow";
import {listOptions} from "../../lib/react-query/query-options/media.options";
import {useDebouncedValue} from "../../lib/use-debounced-value";
import {mediaLabels} from "../../lib/media";
import type {MediaType} from "../../lib/api-client";
import {colors} from "../../theme";

export function TrackingListScreen() {
    const {mediaType} = useLocalSearchParams<{mediaType: MediaType}>();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [sorting, setSorting] = useState("title_asc");
    const [favorite, setFavorite] = useState(false);
    const debounced = useDebouncedValue(search.trim());
    const focused = useIsFocused();
    const query = useInfiniteQuery({
        ...listOptions(mediaType, {search: debounced, status, sorting, favorite: favorite ? "true" : undefined}),
        enabled: focused,
    });
    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    return (
        <Page
            title={mediaLabels[mediaType] ?? "List"}
            subtitle={first ? `${first.pagination.totalItems.toLocaleString()} entries` : undefined}
            back
        >
            <View style={{padding: 16, gap: 12}}>
                <Field
                    label="Search this list"
                    placeholder="Find a title…"
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    returnKeyType="search"
                />
                <View style={{flexDirection: "row", gap: 12}}>
                    <View style={{flex: 1}}>
                        <Select
                            label="Status"
                            value={status}
                            options={[
                                {label: "All statuses", value: ""},
                                ...(first?.statuses ?? []).map((value) => ({value, label: value})),
                            ]}
                            onChange={setStatus}
                        />
                    </View>
                    <View style={{flex: 1}}>
                        <Select
                            label="Sort"
                            value={sorting}
                            options={(first?.pagination.availableSorting ?? [sorting]).map((value) => ({
                                value,
                                label: value.replaceAll("_", " "),
                            }))}
                            onChange={setSorting}
                        />
                    </View>
                </View>
                <Button
                    secondary
                    label={favorite ? "Showing favorites · Show all" : "Show favorites"}
                    onPress={() => setFavorite((value) => !value)}
                />
            </View>
            <FlatList
                key={`${mediaType}:${debounced}:${status}:${sorting}:${favorite}`}
                data={items}
                keyExtractor={(item) => String(item.mediaId)}
                renderItem={({item}) => (
                    <MediaRow
                        mediaType={mediaType}
                        mediaId={item.mediaId}
                        name={item.name}
                        cover={item.cover}
                        status={item.status}
                        rating={item.rating}
                        favorite={item.favorite}
                        ratingSystem={first?.ratingSystem}
                    />
                )}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
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
                        title={query.isError ? "Couldn’t load this list" : "No matching titles"}
                        message={query.error?.message ?? "Try different filters or add something from Search."}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading />
                    ) : query.isError && items.length ? (
                        <StateView
                            title="Couldn’t load more"
                            message={query.error.message}
                            retry={() => void (query.hasNextPage ? query.fetchNextPage() : query.refetch())}
                        />
                    ) : items.length ? (
                        <AppText muted style={{textAlign: "center", padding: 20}}>
                            {query.hasNextPage ? "Scroll for more" : "You’re all caught up"}
                        </AppText>
                    ) : undefined
                }
            />
        </Page>
    );
}
