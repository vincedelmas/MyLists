import {useTabPush} from "../../lib/use-tab-push";
import {useState} from "react";
import {colors} from "../../theme";
import {useIsFocused} from "expo-router";
import {FlatList, RefreshControl, View} from "react-native";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {FolderOpen, ListFilter, Play} from "lucide-react-native";
import {mediaIcons, mediaLabels, mediaColors} from "../../lib/media";
import {listsSummaryOptions} from "../../lib/react-query/query-options/media.options";
import {libraryOptions} from "../../lib/react-query/query-options/library.options";
import {useDebouncedValue} from "../../lib/use-debounced-value";
import {AppText, Cover, Field, MenuRow, Page, QueryPanel, Section, StateView} from "../../components/ui";

export function ListsScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const [search, setSearch] = useState("");
    const debounced = useDebouncedValue(search.trim());
    const tracking = useQuery({...listsSummaryOptions, enabled: focused});
    const query = useInfiniteQuery({...libraryOptions(debounced), enabled: focused});
    const pages = query.data?.pages ?? [];
    const rows = pages.flatMap((page) => [
        ...page.dynamic.map((item) => ({...item, kind: "dynamic" as const})),
        ...page.collections.map((item) => ({...item, kind: "collection" as const})),
    ]);
    return (
        <Page title="Lists & collections" subtitle="Everything you watch, read, and play">
            <FlatList
                data={rows}
                keyExtractor={(item) => `${item.kind}:${item.id}`}
                contentContainerStyle={{padding: 16, paddingBottom: 32}}
                initialNumToRender={10}
                windowSize={7}
                refreshControl={
                    <RefreshControl
                        refreshing={(query.isRefetching && !query.isFetchingNextPage) || tracking.isRefetching}
                        onRefresh={() => {
                            void query.refetch();
                            void tracking.refetch();
                        }}
                        tintColor={colors.accent}
                    />
                }
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
                }}
                ListHeaderComponent={
                    <View style={{gap: 24, marginBottom: 16}}>
                        <QueryPanel query={tracking}>
                            {(lists) => (
                                <Section title="Tracking lists">
                                    {lists.map((list) => {
                                        const Icon = mediaIcons[list.mediaType];
                                        return (
                                            <MenuRow
                                                key={list.mediaType}
                                                title={mediaLabels[list.mediaType]}
                                                detail={`${list.totalEntries.toLocaleString()} entries`}
                                                icon={<Icon size={23} color={mediaColors[list.mediaType]} />}
                                                onPress={() =>
                                                    push({
                                                        pathname: "/lists/[mediaType]",
                                                        params: {mediaType: list.mediaType},
                                                    })
                                                }
                                            />
                                        );
                                    })}
                                </Section>
                            )}
                        </QueryPanel>
                        <Section>
                            <MenuRow
                                title="Continue"
                                detail="Pick up where you left off"
                                icon={<Play size={22} color={colors.accent} />}
                                onPress={() => push({pathname: "/library/[kind]", params: {kind: "continue"}})}
                            />
                        </Section>
                        <View style={{gap: 14}}>
                            <AppText heading style={{fontSize: 18}}>
                                Your lists & collections
                            </AppText>
                            <Field
                                label="Find a list or collection"
                                placeholder="Search by name…"
                                value={search}
                                onChangeText={setSearch}
                                autoCorrect={false}
                            />
                        </View>
                    </View>
                }
                renderItem={({item}) => (
                    <View
                        style={{
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            overflow: "hidden",
                            backgroundColor: colors.surface,
                        }}
                    >
                        <MenuRow
                            title={item.title}
                            detail={
                                item.kind === "dynamic"
                                    ? `Dynamic list · ${item.total} titles`
                                    : `Collection · ${item.privacy}`
                            }
                            icon={
                                item.kind === "dynamic" ? (
                                    <ListFilter size={22} color={colors.accent} />
                                ) : (
                                    <FolderOpen size={22} color={colors.accent} />
                                )
                            }
                            onPress={() =>
                                push({
                                    pathname: "/library/[kind]",
                                    params: {kind: item.kind, id: String(item.id)},
                                })
                            }
                        />
                        {item.kind === "collection" && item.previews.length > 0 && (
                            <View
                                pointerEvents="none"
                                style={{flexDirection: "row", gap: 8, padding: 12, paddingTop: 0}}
                            >
                                {item.previews.slice(0, 4).map((preview) => (
                                    <Cover
                                        key={`${preview.mediaType}:${preview.mediaId}`}
                                        uri={preview.mediaCover}
                                        style={{width: 52, height: 78}}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={
                            query.isError
                                ? "Couldn’t load lists"
                                : debounced
                                  ? "No matching lists"
                                  : "No saved lists or collections yet"
                        }
                        message={query.error?.message ?? "Your dynamic lists and collections appear here."}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading />
                    ) : query.isError && rows.length ? (
                        <StateView title="Couldn’t load more" retry={() => void query.fetchNextPage()} />
                    ) : undefined
                }
            />
        </Page>
    );
}
