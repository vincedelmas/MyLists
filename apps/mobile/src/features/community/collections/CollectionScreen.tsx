import {CollectionStats} from "./collection-stats";
import {useEffect, useRef, useState} from "react";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useMutation, useQuery} from "@tanstack/react-query";
import {FlatList, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {Heart, ListOrdered} from "lucide-react-native";
import {getMediaDefinition, ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {getMediaSortOptions} from "@/lib/utils/media/sorting";
import {AppText, Button, Page, Select, StateView} from "../../../components/ui";
import {Avatar} from "../../../components/avatar";
import {ChoiceChips} from "../../../components/choice-chips";
import {LayoutToggle, type MediaLayout} from "../../../components/layout-toggle";
import {MediaCard} from "../../../components/media-card";
import {MediaListDetails} from "../../../components/media-list-details";
import {PaginationBar} from "../../../components/pagination-bar";
import {SearchField} from "../../../components/search-field";
import {useDebouncedValue} from "../../../hooks/use-debounced-value";
import {useTabPush} from "../../../hooks/use-tab-push";
import {api} from "../../../lib/api-client";
import {communityCollectionOptions} from "../../../lib/react-query/query-options/collections.options";
import {settingsOptions} from "../../../lib/react-query/query-options/settings.options";
import {useCollectionAction} from "../../../lib/react-query/query-mutations/collections.mutations";
import {mediaColors, mediaIcons, mediaLabels} from "../../../lib/media";
import {colors, commonStyles} from "../../../theme";


type Filters = Parameters<typeof api.communityCollection>[0];


export function CollectionScreen() {
    const focused = useIsFocused();
    const push = useTabPush();
    const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
    const id = Number(collectionId);
    const list = useRef<FlatList>(null);
    const [filters, setFilters] = useState<Filters>({ collectionId: id, page: 1 });
    const [search, setSearch] = useState("");
    const [selectedLayout, setLayout] = useState<MediaLayout | null>(null);
    const settings = useQuery({ ...settingsOptions, enabled: focused });
    const layout = selectedLayout ?? (settings.data?.gridListView === false ? "list" : "grid");
    const term = useDebouncedValue(search.trim());
    const searching = term !== search.trim();
    const query = useQuery({
        ...communityCollectionOptions({ ...filters, search: term }),
        enabled: focused && !searching,
        placeholderData: previous => previous?.collection.id === id ? previous : undefined,
    });
    const data = query.data;
    const collection = data?.collection;
    const mutation = useCollectionAction();
    const { mutate: recordView } = useMutation({ mutationFn: api.communityCollectionAction });
    const viewedId = useRef<number | null>(null);

    useEffect(() => {
        if (!focused || !query.isSuccess || viewedId.current === id) return;
        viewedId.current = id;
        recordView({ collectionId: id, action: "view" });
    }, [focused, id, query.isSuccess, recordView]);

    const mediaTypes = collection?.mediaTypes ?? [];
    const selectedMediaTypes = filters.mediaType ? [filters.mediaType] : mediaTypes;
    const sortingOptions = getMediaSortOptions(selectedMediaTypes, filters.library === "in");
    const statuses = [...new Set(selectedMediaTypes.flatMap(type => getMediaDefinition(type).statuses))];
    const updateFilters = (patch: Partial<Filters>) => {
        setFilters(previous => ({ ...previous, ...patch, page: 1 }));
    };

    return (
        <Page
            title={collection?.title ?? "Collection"}
            back
            action={
                <LayoutToggle value={layout} onChange={setLayout}/>
            }
        >
            <FlatList
                ref={list}
                key={layout}
                data={searching || query.isPlaceholderData ? [] : data?.items ?? []}
                numColumns={layout === "grid" ? 2 : 1}
                keyExtractor={item => `${item.mediaType}:${item.mediaId}`}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={query.isRefetching}
                        tintColor={colors.accent}
                        onRefresh={() => void query.refetch()}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.header}>
                        {collection &&
                            <>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${collection.ownerName}'s profile`}
                                    onPress={() => push({
                                        pathname: "/people/[userId]",
                                        params: { userId: collection.ownerId }
                                    })}
                                    style={({ pressed }) => [styles.owner, pressed && commonStyles.pressed]}
                                >
                                    <Avatar
                                        image={collection.ownerImage}
                                        name={collection.ownerName}
                                        size={32}
                                    />
                                    <View style={styles.identity}>
                                        <AppText muted style={styles.caption}>
                                            Made by
                                        </AppText>
                                        <AppText style={styles.ownerName}>
                                            {collection.ownerName}
                                        </AppText>
                                    </View>
                                    <AppText muted style={styles.caption}>{collection.itemsCount} media</AppText>
                                </Pressable>
                                {collection.description &&
                                    <AppText muted style={styles.description}>
                                        {collection.description}
                                    </AppText>
                                }
                                <View style={styles.stats}>
                                    {collection.ordered &&
                                        <View style={styles.stat}>
                                            <ListOrdered size={14} color={colors.muted}/>
                                            <AppText muted style={styles.caption}>
                                                Ranked collection
                                            </AppText>
                                        </View>
                                    }
                                    <CollectionStats
                                        collection={collection}
                                        includeLikes={false}
                                    />
                                </View>
                                <View style={styles.actions}>
                                    {data?.capabilities.like &&
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={data.isLiked ? "Unlike collection" : "Like collection"}
                                            accessibilityState={{ selected: data.isLiked, disabled: mutation.isPending }}
                                            disabled={mutation.isPending}
                                            onPress={() => mutation.mutate({ collectionId: id, action: "like" })}
                                            style={({ pressed }) => [styles.action, data.isLiked && styles.likedAction, pressed && commonStyles.pressed]}
                                        >
                                            <Heart
                                                size={18}
                                                color={data.isLiked ? colors.favorite : colors.muted}
                                                fill={data.isLiked ? colors.favorite : "none"}
                                            />
                                            <AppText>
                                                {collection.likeCount}
                                            </AppText>
                                        </Pressable>
                                    }
                                    {data?.capabilities.copy &&
                                        <Button
                                            secondary
                                            label="Copy to my collections"
                                            pending={mutation.isPending && mutation.variables?.action === "copy"}
                                            disabled={mutation.isPending}
                                            onPress={() => mutation.mutate({ collectionId: id, action: "copy" }, {
                                                onSuccess: result => {
                                                    if (result.action === "copy") push({
                                                        pathname: "/library/edit",
                                                        params: { kind: "collection", id: result.id }
                                                    });
                                                },
                                            })}
                                        />
                                    }
                                    {data?.isOwn &&
                                        <Button
                                            secondary
                                            label="Edit"
                                            onPress={() => push({
                                                pathname: "/library/edit",
                                                params: { kind: "collection", id }
                                            })}
                                        />
                                    }
                                </View>
                            </>
                        }
                        {mutation.error &&
                            <AppText accessibilityRole="alert" style={styles.error}>
                                {mutation.error.message}
                            </AppText>
                        }
                        <SearchField
                            label="Search this collection"
                            placeholder="Search this collection…"
                            value={search}
                            onChangeText={value => {
                                setSearch(value);
                                updateFilters({});
                            }}
                        />
                        <ChoiceChips
                            label="Collection media type"
                            value={filters.mediaType ?? "all"}
                            options={[
                                { value: "all", label: "All media" },
                                ...ALL_MEDIA_TYPES.filter(type => mediaTypes.includes(type)).map(value => ({
                                    value,
                                    label: mediaLabels[value],
                                    color: mediaColors[value],
                                    icon: mediaIcons[value]
                                })),
                            ]}
                            onChange={value => updateFilters({ mediaType: value === "all" ? undefined : value as Filters["mediaType"], sorting: undefined, status: undefined })}
                        />
                        <ChoiceChips
                            label="Media in your library"
                            value={filters.library ?? "all"}
                            options={[
                                { value: "all", label: "All media" },
                                { value: "in", label: "In my lists" },
                                { value: "out", label: "Not in my lists" }
                            ]}
                            onChange={value => updateFilters({ library: value === "all" ? undefined : value as Filters["library"], sorting: undefined, status: undefined })}
                        />
                        {filters.library === "in" &&
                            <Select
                                label="Status"
                                value={filters.status ?? "all"}
                                options={[
                                    { value: "all", label: "All statuses" },
                                    ...statuses.map(value => ({ value, label: value }))
                                ]}
                                onChange={value => updateFilters({ status: value === "all" ? undefined : value as Filters["status"] })}
                            />
                        }
                        <Select
                            label="Sort titles"
                            value={filters.sorting ?? "default"}
                            options={[
                                { value: "default", label: "Collection order" },
                                ...sortingOptions
                            ]}
                            onChange={value => updateFilters({ sorting: value as Filters["sorting"] })}
                        />
                    </View>
                }
                renderItem={({ item }) =>
                    <MediaCard
                        name={item.name}
                        cover={item.cover}
                        layout={layout}
                        detail={collection?.ordered ? `#${item.orderIndex}` : undefined}
                        onPress={() => push({
                            pathname: "/media/[mediaType]/[mediaId]",
                            params: { mediaType: item.mediaType, mediaId: item.mediaId }
                        })}
                    >
                        <MediaListDetails
                            {...item}
                            ratingSystem={data!.ratingSystem}
                        />
                        {item.annotation &&
                            <AppText style={styles.annotation}>
                                {item.annotation}
                            </AppText>
                        }
                    </MediaCard>
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending || searching || query.isPlaceholderData}
                        title={query.error ? "Couldn’t load this collection" : "No matching titles"}
                        message={query.error?.message ?? "Try another search or filter."}
                        retry={query.error ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={query.error && data?.items.length
                    ? <StateView
                        title="Couldn’t refresh this collection"
                        message={query.error.message}
                        retry={() => void query.refetch()}
                    />
                    : undefined
                }
            />
            <PaginationBar
                page={filters.page ?? 1}
                pages={data?.pages ?? filters.page ?? 1}
                disabled={!data || searching || query.isPending || query.isPlaceholderData}
                onChange={page => {
                    setFilters(previous => ({ ...previous, page }));
                    list.current?.scrollToOffset({ offset: 0, animated: false });
                }}
            />
        </Page>
    );
}


const styles = StyleSheet.create({
    content: { padding: 10, paddingBottom: 24 },
    header: { padding: 6, gap: 16, paddingBottom: 16 },
    owner: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        minHeight: 48
    },
    identity: { flex: 1, gap: 3 },
    ownerName: { fontWeight: "600" },
    caption: { fontSize: 12 },
    description: { fontSize: 14, lineHeight: 22 },
    stats: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    stat: { flexDirection: "row", alignItems: "center", gap: 5 },
    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10
    },
    action: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 72,
        minHeight: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12
    },
    likedAction: { borderColor: colors.favorite },
    annotation: { fontSize: 12, lineHeight: 19, color: colors.muted },
    error: { color: colors.error, fontSize: 13 },
});
