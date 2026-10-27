import {SavedListCard, type SavedList} from "./saved-list-card";
import {useEffect, useMemo, useRef, useState} from "react";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {FlatList, RefreshControl, View} from "react-native";
import {FolderOpen, ListFilter, Trash2} from "lucide-react-native";
import {useLibraryAction} from "../../lib/react-query/query-mutations/library.mutations";
import {useTabPush} from "../../hooks/use-tab-push";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {useConfirmation} from "../../hooks/use-confirmation";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {SearchField} from "../../components/search-field";
import {PaginationBar} from "../../components/pagination-bar";
import {ChoiceChips} from "../../components/choice-chips";
import {MediaListGrid} from "../../components/media-list-grid";
import {AppText, Page, QueryPanel, StateView} from "../../components/ui";
import {libraryOptions} from "../../lib/react-query/query-options/library.options";
import {listsSummaryOptions} from "../../lib/react-query/query-options/media.options";
import {profileOptions} from "../../lib/react-query/query-options/profile.options";
import {profileSettingsOptions} from "../../lib/react-query/query-options/settings.options";
import {colors} from "../../theme";


type Kind = "dynamic" | "collection";


export function ListsScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const params = useLocalSearchParams<{ userId?: string; username?: string }>();
    const userId = params.userId ? Number(params.userId) : undefined;
    const [kind, setKind] = useState<Kind>("collection");
    const [pages, setPages] = useState({ collection: 1, dynamic: 1 });
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const searching = term !== search.trim();
    const list = useRef<FlatList>(null);
    const tracking = useQuery({ ...listsSummaryOptions, enabled: focused && !userId });
    const profile = useQuery({
        ...profileOptions(userId),
        select: data => data.lists,
        enabled: focused && !!userId
    });
    const pins = useQuery({ ...profileSettingsOptions, enabled: focused && !userId });
    const query = useQuery({ ...libraryOptions(term, pages[kind], userId), enabled: focused && !searching });
    const rows = useMemo<SavedList[]>(() => {
        if (searching) return [];

        if (kind === "dynamic") {
            return query.data?.dynamic.map(item => ({ ...item, kind: "dynamic" as const })) ?? [];
        }

        return query.data?.collections.map(item => ({ ...item, kind: "collection" as const })) ?? [];
    }, [query.data, kind, searching]);
    const { confirmation, confirm, dismiss } = useConfirmation();
    const mutation = useLibraryAction(dismiss);
    const maxPage = query.data ? kind === "dynamic" ? query.data.dynamicPages : query.data.collectionPages : pages[kind];
    useEffect(() => {
        // An external refetch or deletion can remove the last page.
        // oxlint-disable-next-line react-you-might-not-need-an-effect/no-event-handler, react-you-might-not-need-an-effect/no-chain-state-updates, react-you-might-not-need-an-effect/no-derived-state
        if (query.data && pages[kind] > Math.max(1, maxPage)) setPages(previous => ({ ...previous, [kind]: Math.max(1, maxPage) }));
    }, [query.data, kind, maxPage, pages]);

    return (
        <Page
            title="Lists & collections"
            subtitle={userId ? params.username : undefined}
            back={!!userId}
        >
            <FlatList
                ref={list}
                data={rows}
                keyExtractor={item => `${item.kind}:${item.id}`}
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={5}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={query.isRefetching}
                        onRefresh={() => void query.refetch()}
                    />
                }
                ListHeaderComponent={
                    <View style={{ gap: 20, paddingBottom: 16 }}>
                        <QueryPanel query={userId ? profile : tracking}>
                            {lists =>
                                <View style={{ gap: 12 }}>
                                    <AppText
                                        heading
                                        style={{ fontSize: 18 }}
                                    >
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
                        <SearchField
                            label="Find a saved list"
                            value={search}
                            onChangeText={value => {
                                setSearch(value);
                                setPages({ collection: 1, dynamic: 1 });
                            }}
                            placeholder="Search lists & collections…"
                        />
                        <ChoiceChips
                            label="Saved list type"
                            value={kind}
                            onChange={value => {
                                setKind(value);
                                list.current?.scrollToOffset({ offset: 0, animated: false });
                            }}
                            options={[
                                {
                                    value: "collection",
                                    label: `Collections${query.data ? ` (${query.data.collectionTotal})` : ""}`,
                                    icon: FolderOpen
                                },
                                { value: "dynamic", label: `Dynamic lists${query.data ? ` (${query.data.dynamicTotal})` : ""}`, icon: ListFilter }
                            ]}
                        />
                    </View>
                }
                renderItem={({ item }) => {
                    const pinned = !userId && (pins.data?.pins.some(pin => pin.kind === item.kind && pin.id === item.id) ?? false);
                    const onAction = (action: string) => {
                        if (action === "pin") mutation.mutate({
                            action: "pin",
                            kind: item.kind,
                            id: item.id,
                            pinned: !pinned
                        });
                        else if (action === "edit") push({
                            pathname: "/library/edit",
                            params: { kind: item.kind, id: item.id }
                        });
                        else if (action === "delete") confirm({
                            title: `Delete this ${item.kind === "collection" ? "collection" : "dynamic list"}?`,
                            message: "Your tracked media will stay in your lists. This saved list will be permanently deleted.",
                            label: "Delete",
                            cancelLabel: "Keep list",
                            icon: Trash2,
                            closeOnConfirm: false,
                            onConfirm: () => mutation.mutate({ action: "delete", kind: item.kind, id: item.id })
                        });
                    };

                    return (
                        <SavedListCard
                            item={item}
                            pinned={pinned}
                            owner={!userId}
                            disabled={mutation.isPending}
                            onAction={onAction}
                            onOpen={() => push({
                                pathname: "/library/[kind]",
                                params: { kind: item.kind, id: item.id, userId }
                            })}
                        />
                    );
                }
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending || searching}
                        title={query.error
                            ? "Couldn’t load lists"
                            : term ? "No matching saved lists" : kind === "collection" ? "No collections yet" : "No dynamic lists yet"}
                        message={query.error?.message}
                        retry={query.error ? () => void query.refetch() : undefined}
                    />
                }
            />
            {mutation.error &&
                <AppText
                    accessibilityRole="alert"
                    style={{ color: colors.error, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                    {mutation.error.message}
                </AppText>
            }
            <PaginationBar
                page={pages[kind]}
                pages={maxPage ?? pages[kind]}
                disabled={!query.data || searching || query.isPending}
                onChange={page => {
                    setPages(previous => ({ ...previous, [kind]: page }));
                    list.current?.scrollToOffset({ offset: 0, animated: false });
                }}
            />
            <ConfirmationSheet
                confirmation={confirmation}
                dismiss={dismiss}
                pending={mutation.isPending}
                error={mutation.error?.message}
            />
        </Page>
    );
}
