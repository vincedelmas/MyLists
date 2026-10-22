import {useState} from "react";
import {colors} from "../../theme";
import {useIsFocused} from "expo-router";
import {mediaLabels} from "../../lib/media";
import {ratingLabel} from "../../lib/ratings";
import {useLocalSearchParams} from "expo-router";
import {useTabPush} from "../../hooks/use-tab-push";
import type {MediaType} from "../../lib/api-client";
import {MediaCard} from "../../components/media-card";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl, View} from "react-native";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {parseListFilters, countListFilters} from "./list-filters";
import {AppText, Button, Field, Page, StateView} from "../../components/ui";
import {LayoutToggle, type MediaLayout} from "../../components/layout-toggle";
import {listOptions} from "../../lib/react-query/query-options/media.options";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";


export function TrackingListScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const [search, setSearch] = useState("");
    const [layout, setLayout] = useState<MediaLayout>("grid");

    const debounced = useDebouncedValue(search.trim());
    const { mediaType, userId, filters: serializedFilters } = useLocalSearchParams<{ mediaType: MediaType; userId?: string; filters?: string }>();

    const filters = parseListFilters(serializedFilters);
    const count = countListFilters(filters);
    const sorting = filters.sorting ?? getMediaDefinition(mediaType).sorting.default;

    const query = useInfiniteQuery({
        ...listOptions(mediaType, { ...filters, search: debounced, sorting }, userId ? Number(userId) : undefined),
        enabled: focused,
    });

    const first = query.data?.pages[0];
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <Page
            back={true}
            title={mediaLabels[mediaType] ?? "List"}
            action={<LayoutToggle value={layout} onChange={setLayout}/>}
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
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <Button
                        secondary
                        label={`Filters${count ? ` · ${count}` : ""}`}
                        onPress={() =>
                            push({
                                pathname: "/lists/[mediaType]/filters",
                                params: { mediaType, userId, filters: serializedFilters },
                            })
                        }
                    />
                    <AppText muted numberOfLines={1} style={{ fontSize: 12, flex: 1, textAlign: "right" }}>
                        {getMediaSortOptions([mediaType], true)
                            .find((item) => item.value === sorting)?.label
                        }
                    </AppText>
                </View>
            </View>
            <FlatList
                data={items}
                windowSize={7}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                onEndReachedThreshold={0.5}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                numColumns={layout === "grid" ? 2 : 1}
                contentContainerStyle={{ padding: 10 }}
                keyExtractor={(item) => String(item.mediaId)}
                key={`${layout}:${mediaType}:${debounced}:${serializedFilters}`}
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
                renderItem={({ item }) => (
                    <MediaCard
                        layout={layout}
                        name={item.name}
                        cover={item.cover}
                        detail={[
                            item.status,
                            item.rating == null ? null : ratingLabel(item.rating, first?.ratingSystem ?? "score"),
                            item.favorite ? "♥" : null,
                        ].filter(Boolean).join(" · ")}
                        onPress={() =>
                            push({
                                pathname: "/media/[mediaType]/[mediaId]",
                                params: { mediaType: mediaType, mediaId: String(item.mediaId) },
                            })
                        }
                    />
                )}

                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading/>
                    ) : query.isError && items.length ? (
                        <StateView
                            title="Couldn’t load more"
                            message={query.error.message}
                            retry={() => void (query.hasNextPage ? query.fetchNextPage() : query.refetch())}
                        />
                    ) : items.length ? (
                        <AppText muted style={{ textAlign: "center", padding: 20 }}>
                            {query.hasNextPage ? "Scroll for more" : "You’re all caught up"}
                        </AppText>
                    ) : undefined
                }
            />
        </Page>
    );
}
