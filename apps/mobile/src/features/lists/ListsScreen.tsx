import {useState} from "react";
import {colors} from "../../theme";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useTabPush} from "../../hooks/use-tab-push";
import {FolderOpen, ListFilter} from "lucide-react-native";
import {MediaListGrid} from "../../components/media-list-grid";
import {SectionList, RefreshControl, View} from "react-native";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {libraryOptions} from "../../lib/react-query/query-options/library.options";
import {listsSummaryOptions} from "../../lib/react-query/query-options/media.options";
import {profileOptions} from "../../lib/react-query/query-options/profile.options";
import {AppText, Cover, Field, MenuRow, Page, QueryPanel, StateView} from "../../components/ui";

export function ListsScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const params = useLocalSearchParams<{ userId?: string; username?: string }>();
    const userId = params.userId ? Number(params.userId) : undefined;
    const [search, setSearch] = useState("");
    const debounced = useDebouncedValue(search.trim());
    const tracking = useQuery({ ...listsSummaryOptions, enabled: focused && !userId });
    const profile = useQuery({ ...profileOptions(userId), select: (data) => data.lists, enabled: focused && !!userId });
    const query = useInfiniteQuery({ ...libraryOptions(debounced, userId), enabled: focused });

    const pages = query.data?.pages ?? [];
    const rows = pages.flatMap((page) => [
        ...page.dynamic.map((item) => ({ ...item, kind: "dynamic" as const })),
        ...page.collections.map((item) => ({ ...item, kind: "collection" as const })),
    ]);

    return (
        <Page title="Lists & collections" subtitle={userId ? params.username : "Everything you watch, read, and play"} back={!!userId}>
            <SectionList<(typeof rows)[number]>
                windowSize={7}
                initialNumToRender={10}
                onEndReachedThreshold={0.5}
                stickySectionHeadersEnabled={false}
                keyExtractor={(item) => `${item.kind}:${item.id}`}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                renderSectionHeader={({ section }) =>
                    <AppText heading style={{ fontSize: 18, paddingVertical: 14 }}>
                        {section.title}
                    </AppText>
                }
                sections={[
                    {
                        title: "Dynamic lists",
                        data: rows.filter((item) => item.kind === "dynamic"),
                    },
                    {
                        title: "Collections",
                        data: rows.filter((item) => item.kind === "collection")
                    },
                ]}
                renderSectionFooter={({ section }) => section.data.length === 0 && query.isSuccess
                    ? <AppText muted style={{ paddingBottom: 16 }}>
                        No {section.title.toLowerCase()} found.
                    </AppText>
                    : null
                }
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) {
                        void query.fetchNextPage();
                    }
                }}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={(query.isRefetching && !query.isFetchingNextPage) || (userId ? profile.isRefetching : tracking.isRefetching)}
                        onRefresh={() => {
                            void query.refetch();
                            if (userId) void profile.refetch();
                            else void tracking.refetch();
                        }}
                    />
                }
                ListHeaderComponent={
                    <View style={{ gap: 24, marginBottom: 16 }}>
                        <QueryPanel query={userId ? profile : tracking}>
                            {(lists) =>
                                <View style={{ gap: 12 }}>
                                    <AppText heading style={{ fontSize: 18 }}>
                                        Tracking lists
                                    </AppText>
                                    <MediaListGrid
                                        lists={lists}
                                        userId={userId}
                                        includeContinue={!userId}
                                    />
                                </View>
                            }
                        </QueryPanel>
                        <View style={{ gap: 14 }}>
                            <AppText heading style={{ fontSize: 18 }}>
                                Find a saved list
                            </AppText>
                            <Field
                                clearable
                                value={search}
                                autoCorrect={false}
                                onChangeText={setSearch}
                                placeholder="Search by name…"
                                label="Find a list or collection"
                            />
                        </View>
                    </View>
                }
                renderItem={({ item }) => (
                    <View
                        style={{
                            borderWidth: 1,
                            marginBottom: 12,
                            borderRadius: 12,
                            overflow: "hidden",
                            borderColor: colors.border,
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
                                    <ListFilter size={22} color={colors.accent}/>
                                ) : (
                                    <FolderOpen size={22} color={colors.accent}/>
                                )
                            }
                            onPress={() =>
                                push({
                                    pathname: "/library/[kind]",
                                    params: { kind: item.kind, id: String(item.id), userId },
                                })
                            }
                        />
                        {(item.kind === "collection" && item.previews.length > 0) &&
                            <View
                                pointerEvents="none"
                                style={{ flexDirection: "row", gap: 8, padding: 12, paddingTop: 0 }}
                            >
                                {item.previews.slice(0, 4).map((preview) => (
                                    <Cover
                                        uri={preview.mediaCover}
                                        style={{ width: 52, height: 78 }}
                                        key={`${preview.mediaType}:${preview.mediaId}`}
                                    />
                                ))}
                            </View>
                        }
                    </View>
                )}
                ListFooterComponent={
                    rows.length === 0 ? (
                        <StateView
                            loading={query.isPending}
                            retry={query.isError ? () => void query.refetch() : undefined}
                            message={query.error?.message ?? (userId ? "This user’s dynamic lists and collections appear here." : "Your dynamic lists and collections appear here.")}
                            title={
                                query.isError
                                    ? "Couldn’t load lists"
                                    : debounced
                                        ? "No matching lists"
                                        : "No saved lists or collections yet"
                            }
                        />
                    ) : query.isFetchingNextPage ? (
                        <StateView loading/>
                    ) : query.isError ? (
                        <StateView title="Couldn’t load more" retry={() => void query.fetchNextPage()}/>
                    ) : undefined
                }
            />
        </Page>
    );
}
