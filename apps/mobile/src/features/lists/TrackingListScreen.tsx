import {useState} from "react";
import {colors} from "../../theme";
import {useIsFocused} from "expo-router";
import {mediaLabels} from "../../lib/media";
import {useLocalSearchParams} from "expo-router";
import {MediaRow} from "../../components/MediaRow";
import type {MediaType} from "../../lib/api-client";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl, View} from "react-native";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {useDebouncedValue} from "../../lib/use-debounced-value";
import {listOptions} from "../../lib/react-query/query-options/media.options";
import {AppText, Button, Field, Page, Select, StateView} from "../../components/ui";


export function TrackingListScreen() {
    const focused = useIsFocused();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [favorite, setFavorite] = useState(false);
    const debounced = useDebouncedValue(search.trim());
    const [sorting, setSorting] = useState("title_asc");
    const { mediaType } = useLocalSearchParams<{ mediaType: MediaType }>();
    const query = useInfiniteQuery({
        ...listOptions(mediaType, { search: debounced, status, sorting, favorite: favorite ? "true" : undefined }),
        enabled: focused,
    });

    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <Page
            back={true}
            title={mediaLabels[mediaType] ?? "List"}
            subtitle={first ? `${first.pagination.totalItems.toLocaleString()} entries` : undefined}
        >
            <View style={{ padding: 16, gap: 12 }}>
                <Field
                    value={search}
                    autoCorrect={false}
                    returnKeyType="search"
                    label="Search this list"
                    onChangeText={setSearch}
                    placeholder="Find a title…"
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Select
                            label="Status"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { label: "All statuses", value: "" },
                                ...(first?.statuses ?? []).map((value) => ({ value, label: value })),
                            ]}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Select
                            label="Sort"
                            value={sorting}
                            onChange={setSorting}
                            options={getMediaSortOptions([mediaType], true)}
                        />
                    </View>
                </View>
                <Button
                    secondary
                    onPress={() => setFavorite((value) => !value)}
                    label={favorite ? "Showing favorites · Show all" : "Show favorites"}
                />
            </View>
            <FlatList
                data={items}
                windowSize={7}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                onEndReachedThreshold={0.5}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item) => String(item.mediaId)}
                key={`${mediaType}:${debounced}:${status}:${sorting}:${favorite}`}
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
                        retry={query.isError ? () => void query.refetch() : undefined}
                        title={query.isError ? "Couldn’t load this list" : "No matching titles"}
                        message={query.error?.message ?? "Try different filters or add something from Search."}
                    />
                }
                renderItem={({ item }) =>
                    <MediaRow
                        name={item.name}
                        cover={item.cover}
                        status={item.status}
                        rating={item.rating}
                        mediaType={mediaType}
                        mediaId={item.mediaId}
                        favorite={item.favorite}
                        ratingSystem={first?.ratingSystem}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ?
                        <StateView loading/>
                        :
                        query.isError && items.length ?
                            <StateView
                                title="Couldn’t load more"
                                message={query.error.message}
                                retry={() => void (query.hasNextPage ? query.fetchNextPage() : query.refetch())}
                            />
                            :
                            items.length ?
                                <AppText muted style={{ textAlign: "center", padding: 20 }}>
                                    {query.hasNextPage ? "Scroll for more" : "You’re all caught up"}
                                </AppText>
                                :
                                undefined
                }
            />
        </Page>
    );
}
