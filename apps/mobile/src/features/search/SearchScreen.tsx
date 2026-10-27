import {navbarSearchSchema} from "@/lib/schemas/search.schema";
import {AdvancedSearchSheet} from "./advanced-search-sheet";
import {SearchField} from "../../components/search-field";
import {memo, useCallback, useMemo, useReducer, useRef, useState} from "react";
import {useFocusEffect, useIsFocused, useNavigation} from "expo-router";
import type {BottomTabNavigationProp} from "expo-router/js-tabs";
import {ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, View} from "react-native";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {BookImage, Check, ChevronRight, Gamepad2, Globe, Library, Lock, Monitor, Search, SearchX, Shield, SlidersHorizontal, UserRound} from "lucide-react-native";
import {formatDate} from "@/lib/utils/formatting/date";
import {capitalize} from "@/lib/utils/formatting/text";
import {useTabPush} from "../../hooks/use-tab-push";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import type {TabParamList} from "../../lib/navigation.types";
import type {SearchInput, SearchResult} from "../../lib/api-client";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {searchOptions} from "../../lib/react-query/query-options/search.options";
import {useResolveMutation} from "../../lib/react-query/query-mutations/media.mutations";
import {AppText, Cover, Page, StateView} from "../../components/ui";
import {ChoiceChips} from "../../components/choice-chips";
import {colors} from "../../theme";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";

const providers = [
    { value: "tmdb", label: "Movies & TV", icon: Monitor, hint: "Series, anime and movies, all in one search." },
    { value: "books", label: "Books", icon: Library, color: mediaColors.books, hint: "Find your next read by title or author." },
    { value: "igdb", label: "Games", icon: Gamepad2, color: mediaColors.games, hint: "Find the games you play, or plan to play." },
    { value: "manga", label: "Manga", icon: BookImage, color: mediaColors.manga, hint: "Find manga to start your next chapter." },
    { value: "users", label: "People", icon: UserRound, hint: "Find people by name and explore their lists." },
] as const;

type SearchItem = SearchResult["data"][number];
const privacyIcons = { public: Globe, restricted: Shield, private: Lock };

export function SearchScreen() {
    const push = useTabPush();
    const navigation = useNavigation();
    const list = useRef<FlatList<SearchItem>>(null);
    const [focusKey, focusSearch] = useReducer((key: number) => key + 1, 0);
    useFocusEffect(useCallback(() => {
        // Remounting also focuses the native field in Expo Go, where imperative focus is unavailable.
        focusSearch();
        const tabs = navigation.getParent<BottomTabNavigationProp<TabParamList>>()!;
        return tabs.addListener("tabPress", ({ target }) => {
            const state = tabs.getState();
            if (target === state.routes[state.index].key) focusSearch();
        });
    }, [navigation]));
    const [text, setText] = useState("");
    const [advancedFilters, setAdvancedFilters] = useState<SearchInput["advancedFilters"]>();
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedProvider, setProvider] = useState<SearchInput["apiProvider"] | null>(null);
    const settings = useQuery(settingsOptions);
    const provider = selectedProvider ?? settings.data?.searchSelector ?? "tmdb";
    const selected = providers.find(item => item.value === provider)!;
    const trimmed = text.trim();
    const term = useDebouncedValue(trimmed);
    const focused = useIsFocused();
    const hasCriteria = trimmed.length >= 2 || !!advancedFilters;
    const ready = hasCriteria && trimmed === term && navbarSearchSchema.safeParse({ query: term, apiProvider: provider, page: 1, advancedFilters }).success;
    const query = useInfiniteQuery({ ...searchOptions(term, provider, advancedFilters), enabled: focused && ready });
    const resolve = useResolveMutation();
    const { mutate: resolveMedia, isPending: openingMedia } = resolve;
    const results = useMemo(() => ready ? query.data?.pages.flatMap(page => page.data) ?? [] : [], [query.data, ready]);
    const loading = hasCriteria && (trimmed !== term || (ready && query.isPending));
    const open = useCallback((item: SearchItem) => {
        if (openingMedia) return;
        Keyboard.dismiss();
        if (item.itemType === "users") {
            push({ pathname: "/people/[userId]", params: { userId: String(item.id) } });
            return;
        }
        const mediaType = item.itemType;
        const navigate = (mediaId: number) => push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType, mediaId: String(mediaId) } });
        if (item.mediaId) navigate(item.mediaId);
        else resolveMedia({ mediaType, apiId: item.id }, { onSuccess: data => navigate(data.mediaId) });
    }, [push, openingMedia, resolveMedia]);
    const renderItem = useCallback(({ item }: { item: SearchItem }) => <SearchResultRow item={item} onOpen={open} disabled={resolve.isPending}
                                                                                        opening={resolve.isPending && resolve.variables?.mediaType === item.itemType && resolve.variables.apiId === item.id}/>,
        [open, resolve.isPending, resolve.variables]);
    const Icon = selected.icon;

    return <Page title="Search" hideHeader>
        <View style={styles.header}>
            <AppText heading style={styles.title}>Search</AppText>
            <SearchField key={focusKey} label={provider === "users" ? "Search people" : "Search titles"} hideLabel clearable autoFocus
                         leadingIcon={<Search size={20} color={colors.muted}/>} value={text} placeholder={provider === "users" ? "Search by name…" : "Search titles…"}
                         onChangeText={value => {
                             setText(value);
                             resolve.reset();
                             list.current?.scrollToOffset({ offset: 0, animated: false });
                         }} autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()}
                         textStyle={{ fontSize: 16 }}/>
        </View>
        {(provider === "tmdb" || provider === "books" || provider === "igdb") && <Pressable accessibilityRole="button" accessibilityLabel="Advanced search" onPress={() => {
            Keyboard.dismiss();
            setFiltersOpen(true);
        }} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 }}><SlidersHorizontal size={18}
                                                                                                                                   color={advancedFilters ? colors.accent : colors.muted}/><AppText
            style={{ fontSize: 12, color: advancedFilters ? colors.accent : colors.muted }}>Advanced search{advancedFilters ? " · Filters applied" : ""}</AppText></Pressable>}
        {filtersOpen && (provider === "tmdb" || provider === "books" || provider === "igdb") &&
            <AdvancedSearchSheet provider={provider} query={trimmed} applied={advancedFilters} apply={setAdvancedFilters} dismiss={() => {
                setFiltersOpen(false);
                list.current?.scrollToOffset({ offset: 0, animated: false });
            }}/>}
        <View style={styles.providerBar}>
            <ChoiceChips options={providers} value={provider} label="Search in" onChange={value => {
                setProvider(value);
                setAdvancedFilters(undefined);
                resolve.reset();
                list.current?.scrollToOffset({ offset: 0, animated: false });
            }}/>
        </View>
        <FlatList ref={list} data={results} keyExtractor={item => `${item.itemType}:${item.id}`} renderItem={renderItem}
                  contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
                  initialNumToRender={7} maxToRenderPerBatch={7} windowSize={7}
                  ListHeaderComponent={<>
                      {resolve.error && <View style={styles.openError}><AppText accessibilityRole="alert" style={styles.error}>
                          Couldn’t open this title. {resolve.error.message} Tap the result to try again.
                      </AppText></View>}
                      {results.length > 0 && <View style={styles.resultsHeading}>
                          <AppText heading style={styles.sectionTitle}>{selected.label} results</AppText>
                          {query.isFetching && !query.isFetchingNextPage ? <ActivityIndicator size="small" color={colors.accent}/> :
                              <AppText muted style={styles.caption}>{results.length}{query.hasNextPage ? "+" : ""} found</AppText>}
                      </View>}
                  </>}
                  ListEmptyComponent={loading ? <StateView loading/> : ready && query.isError ?
                      <StateView title="Search unavailable" message={query.error.message} retry={() => void query.refetch()}/> :
                      <View style={styles.empty}>
                          <View style={styles.emptyIcon}>{ready ? <SearchX size={30} color={colors.muted}/> :
                              <Icon size={30} color={"color" in selected ? selected.color : colors.accent}/>}</View>
                          <AppText heading
                                   style={styles.emptyTitle}>{ready ? "No results found" : trimmed ? "Keep typing…" : provider === "users" ? "Find your people" : provider === "tmdb" ? "Find movies & TV" : `Find ${selected.label.toLowerCase()}`}</AppText>
                          <AppText muted
                                   style={styles.emptyDescription}>{ready ? provider === "users" ? "Try another name or choose another category." : "Try a broader title or choose another category." : trimmed ? "Enter at least two characters to search." : selected.hint}</AppText>
                      </View>}
                  onEndReachedThreshold={0.5} onEndReached={() => {
            if (focused && ready && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage();
        }}
                  ListFooterComponent={query.isFetchingNextPage ? <StateView loading/> : results.length > 0 && query.isError ?
                      <StateView title="Couldn’t load more results" message={query.error.message}
                                 retry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}/> : undefined}/>
    </Page>;
}

const SearchResultRow = memo(function SearchResultRow({ item, onOpen, opening, disabled }: {
    item: SearchItem;
    onOpen: (item: SearchItem) => void;
    opening: boolean;
    disabled: boolean;
}) {
    const { itemType } = item;
    const person = itemType === "users";
    const color = person ? colors.accent : mediaColors[itemType];
    const Icon = person ? item.privacy ? privacyIcons[item.privacy] : UserRound : mediaIcons[itemType];

    return <Pressable accessibilityRole="button"
                      accessibilityLabel={`${item.name}${person ? ", view profile" : `, ${mediaLabels[itemType]}`}${item.inCurrentUserList ? ", in your list" : ""}`}
                      accessibilityState={{ busy: opening, disabled }} disabled={disabled} onPress={() => onOpen(item)}
                      style={({ pressed }) => [styles.result, person && styles.personResult, pressed && styles.pressed]}>
        <View>
            <Cover uri={item.image} label={item.name} style={person ? styles.avatar : styles.cover}/>
            {!item.image && <View pointerEvents="none" style={styles.coverFallback}>
                {person ? <AppText style={styles.initial}>{Array.from(item.name)[0].toLocaleUpperCase()}</AppText> : <Icon size={24} color={color}/>}
            </View>}
        </View>
        <View style={styles.identity}>
            <AppText numberOfLines={2} style={styles.resultTitle}>{item.name}</AppText>
            <View style={[styles.typeBadge, { backgroundColor: `${color}15` }]}><Icon size={12} color={color}/>
                <AppText style={[styles.typeLabel, { color }]}>{person ? item.privacy ? `${capitalize(item.privacy)} profile` : "Profile" : mediaLabels[itemType]}</AppText>
            </View>
            {item.date && <AppText muted style={styles.caption}>{person ? "Joined " : ""}{formatDate(item.date)}</AppText>}
            {!person && item.inCurrentUserList &&
                <View style={styles.membership}><Check size={12} color={colors.accent}/><AppText style={styles.membershipLabel}>In your list</AppText></View>}
        </View>
        {opening ? <ActivityIndicator size="small" color={colors.accent}/> : <ChevronRight size={17} color={colors.muted}/>}
    </Pressable>;
});

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 16 },
    title: { fontSize: 26, lineHeight: 34 },
    providerBar: { paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    results: { paddingHorizontal: 16, paddingBottom: 24 },
    resultsHeading: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    sectionTitle: { fontSize: 16, lineHeight: 22 },
    caption: { fontSize: 12, lineHeight: 18, fontVariant: ["tabular-nums"] },
    result: {
        minHeight: 112,
        paddingVertical: 14,
        gap: 14,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    personResult: { minHeight: 88 },
    cover: { width: 74, height: 112, borderRadius: 9 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    coverFallback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    initial: { fontSize: 20, fontWeight: "700", color: colors.muted },
    identity: { flex: 1, minWidth: 0, gap: 6 },
    resultTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
    typeBadge: { alignSelf: "flex-start", maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    typeLabel: { fontSize: 11, lineHeight: 16, fontWeight: "500", flexShrink: 1 },
    membership: { flexDirection: "row", alignItems: "center", gap: 4 },
    membershipLabel: { fontSize: 11, lineHeight: 16, color: colors.accent },
    empty: { alignItems: "center", paddingHorizontal: 20, paddingTop: 40, paddingBottom: 32, gap: 12 },
    emptyIcon: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4
    },
    emptyTitle: { fontSize: 20, lineHeight: 28, textAlign: "center" },
    emptyDescription: { fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 280 },
    openError: { paddingVertical: 12 },
    error: { fontSize: 12, lineHeight: 18, color: colors.error },
    pressed: { opacity: 0.6 },
});
