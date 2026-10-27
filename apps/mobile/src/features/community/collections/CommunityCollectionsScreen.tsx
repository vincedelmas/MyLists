import {useRef, useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl, StyleSheet, View} from "react-native";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {AppText, Page, StateView} from "../../../components/ui";
import {SearchField} from "../../../components/search-field";
import {ChoiceChips} from "../../../components/choice-chips";
import {PaginationBar} from "../../../components/pagination-bar";
import {useDebouncedValue} from "../../../hooks/use-debounced-value";
import {communityCollectionsOptions} from "../../../lib/react-query/query-options/collections.options";
import {mediaColors, mediaIcons, mediaLabels} from "../../../lib/media";
import type {MediaType} from "../../../lib/api-client";
import {colors} from "../../../theme";
import {CollectionCard} from "./collection-card";


const mediaOptions = [
    { value: "all" as const, label: "All media" },
    ...ALL_MEDIA_TYPES.map(value => ({
        value,
        label: mediaLabels[value],
        color: mediaColors[value],
        icon: mediaIcons[value]
    })),
];


export function CommunityCollectionsScreen() {
    const focused = useIsFocused();
    const list = useRef<FlatList>(null);
    const [search, setSearch] = useState("");
    const [mediaType, setMediaType] = useState<MediaType | "all">("all");
    const [page, setPage] = useState(1);
    const term = useDebouncedValue(search.trim());
    const searching = term !== search.trim();
    const query = useQuery({
        ...communityCollectionsOptions({ page, search: term, mediaType: mediaType === "all" ? undefined : mediaType }),
        enabled: focused && !searching,
    });

    return (
        <Page
            title="Community collections"
            subtitle="Made by the community"
            back
        >
            <FlatList
                ref={list}
                data={searching ? [] : query.data?.items ?? []}
                keyExtractor={item => String(item.id)}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
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
                        <SearchField
                            label="Search community collections"
                            placeholder="Search collections…"
                            value={search}
                            onChangeText={value => {
                                setSearch(value);
                                setPage(1);
                            }}
                        />
                        <ChoiceChips
                            label="Collection media type"
                            value={mediaType}
                            options={mediaOptions}
                            onChange={value => {
                                setMediaType(value);
                                setPage(1);
                            }}
                        />
                        <View style={styles.resultsHeading}>
                            <AppText heading style={styles.sectionTitle}>
                                {term || mediaType !== "all" ? "Filtered collections" : "Popular collections"}
                            </AppText>
                            {query.data && !searching &&
                                <AppText muted style={styles.count}>{query.data.total} shared</AppText>
                            }
                        </View>
                    </View>
                }
                renderItem={({ item }) =>
                    <CollectionCard collection={item}/>
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending || searching}
                        title={query.error ? "Couldn’t load collections" : "No collections found"}
                        message={query.error?.message ?? "Try another title or media type."}
                        retry={query.error ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={query.error && query.data?.items.length
                    ? <StateView
                        title="Couldn’t refresh collections"
                        message={query.error.message}
                        retry={() => void query.refetch()}
                    />
                    : undefined
                }
            />
            <PaginationBar
                page={page}
                pages={query.data?.pages ?? page}
                disabled={!query.data || searching || query.isPending}
                onChange={value => {
                    setPage(value);
                    list.current?.scrollToOffset({ offset: 0, animated: false });
                }}
            />
        </Page>
    );
}


const styles = StyleSheet.create({
    content: { padding: 16, gap: 16, paddingBottom: 24 },
    header: { gap: 16 },
    resultsHeading: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12
    },
    sectionTitle: { fontSize: 16 },
    count: {
        fontSize: 12,
        fontVariant: ["tabular-nums"]
    },
});
