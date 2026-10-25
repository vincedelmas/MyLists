import {useTabPush} from "../../hooks/use-tab-push";
import {useCallback, useReducer, useState} from "react";
import {useFocusEffect, useIsFocused, useNavigation} from "expo-router";
import type {BottomTabNavigationProp} from "expo-router/js-tabs";
import type {TabParamList} from "../../lib/navigation.types";
import {FlatList, View, Pressable} from "react-native";
import {colors} from "../../theme";
import {UserRound, Monitor, Gamepad2, Library, BookImage} from "lucide-react-native";
import {mediaLabels} from "../../lib/media";
import {MediaRow} from "../../components/MediaRow";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import type {SearchInput, SearchResult} from "../../lib/api-client";
import {AppText, Cover, Field, Page, StateView} from "../../components/ui";
import {searchOptions} from "../../lib/react-query/query-options/search.options";
import {useResolveMutation} from "../../lib/react-query/query-mutations/media.mutations";

const providers = [
    { value: "tmdb", label: "Movies & TV", icon: Monitor },
    { value: "books", label: "Books", icon: Library },
    { value: "igdb", label: "Games", icon: Gamepad2 },
    { value: "manga", label: "Manga", icon: BookImage },
    { value: "users", label: "People", icon: UserRound },
] as const;

export function SearchScreen() {
    const push = useTabPush();
    const navigation = useNavigation();
    const [focusKey, focusSearch] = useReducer((key: number) => key + 1, 0);
    useFocusEffect(useCallback(() => {
        // Native autofocus also works in Expo Go, where the field's imperative focus handler is unavailable.
        focusSearch();
        const tabs = navigation.getParent<BottomTabNavigationProp<TabParamList>>()!;
        const unsubscribe = tabs.addListener("tabPress", ({ target }) => {
            const state = tabs.getState();
            if (target === state.routes[state.index].key) focusSearch();
        });
        return unsubscribe;
    }, [navigation]));
    const [text, setText] = useState("");
    const [selectedProvider, setProvider] = useState<SearchInput["apiProvider"] | null>(null);
    const settings = useQuery(settingsOptions);
    const provider = selectedProvider ?? settings.data?.searchSelector ?? "tmdb";
    const term = useDebouncedValue(text.trim());
    const focused = useIsFocused();
    const query = useInfiniteQuery({ ...searchOptions(term, provider), enabled: focused && term.length >= 2 });
    const resolve = useResolveMutation();
    const results = query.data?.pages.flatMap((page) => page.data) ?? [];
    const open = (item: SearchResult["data"][number]) => {
        if (item.itemType === "users") {
            push({ pathname: "/people/[userId]", params: { userId: String(item.id) } });
            return;
        }
        if (resolve.isPending) return;
        const mediaType = item.itemType;
        const navigate = (mediaId: number) =>
            push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType, mediaId: String(mediaId) } });
        if ("mediaId" in item && item.mediaId) navigate(item.mediaId);
        else resolve.mutate({ mediaType, apiId: item.id }, { onSuccess: (data) => navigate(data.mediaId) });
    };
    return (
        <Page title="Search" hideHeader>
            <FlatList
                data={[{ itemType: "providers" as const, id: "providers" }, ...results]}
                stickyHeaderIndices={[0]}
                ListHeaderComponentStyle={{ backgroundColor: colors.background, zIndex: 1 }}
                ListHeaderComponent={
                    <View style={{ padding: 16, gap: 12 }}>
                        <Field
                            clearable
                            key={focusKey}
                            autoFocus
                            label="Search"
                            value={text}
                            onChangeText={setText}
                            placeholder="Search titles…"
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {resolve.isPending && <AppText muted>Opening media details…</AppText>}
                        {resolve.error && <AppText accessibilityRole="alert">{resolve.error.message}</AppText>}
                    </View>
                }
                keyExtractor={(item) => `${item.itemType}:${item.id}`}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={10}
                windowSize={7}
                renderItem={({ item }) =>
                    item.itemType === "providers" ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingTop: 0 }}>
                            {providers.map(({ value, label, icon: Icon }) => (
                                <Pressable
                                    key={value}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: provider === value }}
                                    onPress={() => {
                                        setProvider(value);
                                        resolve.reset();
                                    }}
                                    style={({ pressed }) => ({
                                        flexBasis: "30%",
                                        flexGrow: 1,
                                        alignItems: "center",
                                        gap: 8,
                                        padding: 12,
                                        backgroundColor: provider === value ? colors.secondary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: provider === value ? colors.accent : colors.border,
                                        borderRadius: 12,
                                        opacity: pressed ? 0.6 : 1,
                                    })}
                                >
                                    <Icon size={22} color={provider === value ? colors.accent : colors.muted}/>
                                    <AppText style={{ fontSize: 12 }}>{label}</AppText>
                                </Pressable>
                            ))}
                        </View>
                    ) : item.itemType === "users" ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => open(item)}
                            style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
                        >
                            <Cover
                                uri={item.image}
                                label={item.name}
                                style={{ width: 48, height: 48, borderRadius: 24 }}
                            />
                            <AppText>{item.name}</AppText>
                        </Pressable>
                    ) : (
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
                ListFooterComponent={
                    results.length === 0 ? (
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
                    ) : query.isFetchingNextPage ? (
                        <StateView loading/>
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
