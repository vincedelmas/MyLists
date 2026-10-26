import {memo, useCallback, useMemo, useRef, useState} from "react";
import {useIsFocused} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {ArrowUpRight, ChevronRight, Clock3, Crown, Search, Trophy, X} from "lucide-react-native";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {api} from "../../lib/api-client";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {useTabPush} from "../../hooks/use-tab-push";
import {AppText, Cover, Field, Page, StateView} from "../../components/ui";
import {PrivacyBadge} from "../profile/PrivacyBadge";
import {ActionSheet} from "../../components/action-sheet";
import {ChoiceChips, type ChoiceChip} from "../../components/choice-chips";
import {colors, achievementColors} from "../../theme";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";
import {getPersonalRanking, getRankingLevel, type PersonalRanks, type RankedUser, type RankingCategory} from "./hall-of-fame";

const rankingCategories = [
    { value: "normalized", label: "Overall", icon: Trophy },
    { value: "profile", label: "Profile level" },
    ...ALL_MEDIA_TYPES.map(value => ({ value, label: mediaLabels[value], color: mediaColors[value] })),
] satisfies ChoiceChip<RankingCategory>[];

export function HallOfFameScreen() {
    const focused = useIsFocused();
    const list = useRef<FlatList<RankedUser>>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<RankingCategory>("normalized");
    const [selected, setSelected] = useState<RankedUser | "personal" | null>(null);
    const term = useDebouncedValue(search.trim());
    const query = useInfiniteQuery({
        queryKey: ["community", "hall-of-fame", term, category],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => api.hallOfFame({ page: pageParam, search: term, sorting: category }, signal),
        getNextPageParam: last => last.page < last.pages ? last.page + 1 : undefined,
        enabled: focused,
    });
    const items = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
    const first = query.data?.pages[0];
    const podium = !search.trim() && !term && items.length >= 3;
    const rows = useMemo(() => podium ? items.slice(3) : items, [items, podium]);
    const renderItem = useCallback(({ item }: { item: RankedUser }) => <RankingRow item={item} category={category} onSelect={setSelected}/>, [category]);
    const changeCategory = (value: RankingCategory) => {
        if (value === category) return;
        setCategory(value);
        list.current?.scrollToOffset({ offset: 0, animated: false });
    };
    const searching = search.trim() !== term;
    const categoryLabel = rankingCategories.find(item => item.value === category)!.label;

    return (
        <Page title="Hall of Fame" back action={
                                            <Pressable accessibilityRole="button" accessibilityLabel={searchOpen ? "Close profile search" : "Search profiles"} onPress={() => {
                                                setSearchOpen(value => !value);
                                                setSearch("");
                                                list.current?.scrollToOffset({ offset: 0, animated: false });
                                            }} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                                                {searchOpen ? <X size={21} color={colors.text}/> : <Search size={21} color={colors.text}/>}
                                            </Pressable>
                                        }>
            <View style={styles.screen}>
                <View style={styles.controls}>
                    <ChoiceChips options={rankingCategories} value={category} onChange={changeCategory} label="Rank by"/>
                    <View style={styles.context}>
                        <AppText muted
                                 style={styles.contextLabel}>{category === "normalized" ? "Balanced across all media" : category === "profile" ? "Ranked by total time" : `${categoryLabel} rankings`}</AppText>
                        <View style={styles.allTime}><Clock3 size={11} color={colors.muted}/><AppText muted style={styles.contextLabel}>All-time</AppText></View>
                    </View>
                    {searchOpen &&
                        <View style={styles.search}><Field label="Find a profile" placeholder="Search by name…" value={search} clearable autoFocus onChangeText={value => {
                            setSearch(value);
                            list.current?.scrollToOffset({ offset: 0, animated: false });
                        }} autoCorrect={false}/></View>}
                </View>
                <FlatList
                    ref={list}
                    data={rows}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    windowSize={7}
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={styles.list}
                    onEndReachedThreshold={0.5}
                    onEndReached={() => {
                        if (focused && query.hasNextPage && !query.isFetching && !searching) void query.fetchNextPage();
                    }}
                    refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()}/>}
                    ListHeaderComponent={<>
                        {podium && <Podium users={items.slice(0, 3)} category={category} onSelect={setSelected}/>}
                        <View style={styles.listHeading}>
                            <AppText heading style={styles.sectionTitle}>{term ? "Search results" : "The rankings"}</AppText>
                            <AppText muted
                                     style={styles.contextLabel}>{first ? `${formatNumber(first.total, { locale: "en" })} ${first.total === 1 ? "profile" : "profiles"}` : "Loading…"}</AppText>
                        </View>
                        {query.error && items.length > 0 && <StateView title="Couldn’t refresh rankings" message={query.error.message} retry={() => void query.refetch()}/>}
                    </>}
                    ListEmptyComponent={<StateView loading={query.isPending || searching}
                                                   title={query.error ? "Couldn’t load rankings" : term ? "No profiles found" : "No ranked profiles yet"}
                                                   message={query.error?.message ?? (term ? "Try a different name." : "Tracked media will bring this leaderboard to life.")}
                                                   retry={query.error ? () => void query.refetch() : undefined}/>}
                    ListFooterComponent={query.isFetchingNextPage ? <StateView loading/> : items.length > 0 && query.error && query.hasNextPage ?
                        <StateView title="Couldn’t load more profiles" retry={() => void query.fetchNextPage()}/> : undefined}
                />
                {!searchOpen && <PersonalRanking ranks={first?.userRanks} category={category} onPress={() => setSelected("personal")}/>}
            </View>
            {selected && <RankingSheet user={selected === "personal" ? undefined : selected} ranks={first?.userRanks ?? []} dismiss={() => setSelected(null)} onCategory={value => {
                setSelected(null);
                changeCategory(value);
            }}/>}
        </Page>
    );
}

const RankAvatar = memo(function RankAvatar({ user, size, color = colors.border }: { user: RankedUser; size: number; color?: string }) {
    const highlighted = color !== colors.border;
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: highlighted ? 2 : 0, borderColor: color, padding: highlighted ? 3 : 0 }}>
        {user.image ? <Cover uri={user.image} label={user.name} style={{ width: "100%", height: "100%", borderRadius: size / 2 }}/> :
            <View style={[styles.initialAvatar, { borderRadius: size / 2 }]}><AppText
                style={{ fontSize: size * 0.32, fontWeight: "700", color: colors.muted }}>{Array.from(user.name)[0].toLocaleUpperCase()}</AppText></View>}
    </View>;
});

const Podium = memo(function Podium({ users, category, onSelect }: { users: RankedUser[]; category: RankingCategory; onSelect: (user: RankedUser) => void }) {
    return <View style={styles.podium}>
        {[users[1], users[0], users[2]].map((user, index) => {
            const champion = index === 1;
            const color = champion ? achievementColors.gold : index === 0 ? achievementColors.silver : achievementColors.bronze;
            const level = getRankingLevel(user, category);
            return <Pressable key={user.id} accessibilityRole="button"
                              accessibilityLabel={`Rank ${user.rank}, ${user.name}${level === null ? ", inactive list" : `, level ${level}`}. View media levels`}
                              onPress={() => onSelect(user)} style={({ pressed }) => [styles.podiumPerson, !champion && styles.runnerUp, pressed && styles.pressed]}>
                <View style={styles.crown}>{champion && <Crown size={21} color={color}/>}</View>
                <View><RankAvatar user={user} size={champion ? 76 : 60} color={color}/><View style={[styles.medal, { backgroundColor: color }]}><AppText
                    style={styles.medalLabel}>{user.rank}</AppText></View></View>
                <AppText numberOfLines={1} style={[styles.podiumName, champion && { color: colors.text }]}>{user.name}</AppText>
                <AppText style={[styles.podiumLevel, { color }]}>{level === null ? "Inactive" : `Lvl. ${level}`}</AppText>
                {user.isOwn && <AppText style={styles.you}>You</AppText>}
            </Pressable>;
        })}
    </View>;
});

const RankingRow = memo(function RankingRow({ item, category, onSelect }: { item: RankedUser; category: RankingCategory; onSelect: (user: RankedUser) => void }) {
    const level = getRankingLevel(item, category);
    return <Pressable accessibilityRole="button"
                      accessibilityLabel={`Rank ${item.rank ?? "unavailable"}, ${item.name}, ${level === null ? "inactive list" : `level ${level}`}. View media levels`}
                      onPress={() => onSelect(item)} style={({ pressed }) => [styles.row, item.isOwn && styles.ownRow, pressed && styles.pressed]}>
        <AppText muted style={styles.rankNumber}>{item.rank ?? "—"}</AppText>
        <RankAvatar user={item} size={42}/>
        <View style={styles.rowIdentity}><AppText numberOfLines={1} style={styles.rowName}>{item.name}</AppText>{item.isOwn && <AppText style={styles.you}>You</AppText>}</View>
        <View style={styles.rowMetric}><AppText style={styles.rowLevel}>{level ?? "—"}</AppText><AppText muted style={styles.levelLabel}>LEVEL</AppText></View>
        <ChevronRight size={15} color={colors.muted}/>
    </Pressable>;
});

const PersonalRanking = memo(function PersonalRanking({ ranks, category, onPress }: { ranks: PersonalRanks | undefined; category: RankingCategory; onPress: () => void }) {
    const highlight = ranks && getPersonalRanking(ranks, category);
    const Icon = highlight ? mediaIcons[highlight.mediaType] : Trophy;
    return <View style={styles.dock}>
        <Pressable accessibilityRole="button" accessibilityLabel="View your rankings across all media" onPress={onPress} disabled={!ranks}
                   style={({ pressed }) => [styles.personal, pressed && styles.pressed]}>
            <View style={styles.personalIcon}><Icon size={21} color={highlight ? mediaColors[highlight.mediaType] : colors.accent}/></View>
            <View style={styles.rowIdentity}><AppText
                style={styles.personalTitle}>{highlight && (category === "normalized" || category === "profile") ? "Your best category" : "Your rankings"}</AppText><AppText muted
                                                                                                                                                                             style={styles.rowCaption}>{highlight ? `${mediaLabels[highlight.mediaType]}${highlight.active ? highlight.percent === null ? " · Percentile unavailable" : ` · Top ${formatPercent(highlight.percent)}` : " · Inactive"}` : ranks ? "Explore your place in every list" : "Loading your ranks…"}</AppText></View>
            <AppText style={styles.personalRank}>{highlight?.active && highlight.rank !== null ? `#${highlight.rank}` : "—"}</AppText>
            <ChevronRight size={17} color={colors.accent}/>
        </Pressable>
    </View>;
});

function RankingSheet({ user, ranks, dismiss, onCategory }: { user?: RankedUser; ranks: PersonalRanks; dismiss: () => void; onCategory: (value: RankingCategory) => void }) {
    const push = useTabPush();
    return <ActionSheet title={user ? user.name : "Your rankings"} dismiss={dismiss}>
        {user ? <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${user.name}'s profile`} onPress={() => {
                dismiss();
                push({ pathname: "/people/[userId]", params: { userId: String(user.id) } });
            }} style={({ pressed }) => [styles.sheetProfile, pressed && styles.pressed]}>
                <RankAvatar user={user} size={50}/><View style={styles.rowIdentity}><AppText style={styles.rowName}>Profile
                level {getRankingLevel(user, "profile")}</AppText><AppText style={styles.profileLink}>View profile</AppText></View><ArrowUpRight size={18} color={colors.accent}/>
            </Pressable>
            <PrivacyBadge value={user.privacy}/>
        </View> : <AppText muted style={styles.sheetDescription}>Your all-time position in each media category. Tap a category to explore its leaderboard.</AppText>}
        <View>
            {ALL_MEDIA_TYPES.map(mediaType => {
                const Icon = mediaIcons[mediaType];
                const rank = ranks.find(item => item.mediaType === mediaType);
                const setting = user?.settings.find(item => item.mediaType === mediaType);
                const active = user ? !!setting?.active : !!rank?.active;
                const value = user ? getRankingLevel(user, mediaType) : rank?.rank;
                return <Pressable key={mediaType} accessibilityRole="button"
                                  accessibilityLabel={user ? `Open ${user.name}'s ${mediaLabels[mediaType]} list` : `View ${mediaLabels[mediaType]} rankings`}
                                  disabled={user ? !active : false} onPress={() => {
                    if (!user) {
                        onCategory(mediaType);
                        return;
                    }
                    dismiss();
                    push({ pathname: "/lists/[mediaType]", params: { mediaType, userId: user.id } });
                }} style={({ pressed }) => [styles.sheetRow, user && !active && styles.inactive, pressed && styles.pressed]}>
                    <View style={[styles.sheetIcon, { backgroundColor: `${mediaColors[mediaType]}18` }]}><Icon size={19} color={mediaColors[mediaType]}/></View>
                    <View style={styles.rowIdentity}><AppText style={styles.rowName}>{mediaLabels[mediaType]}</AppText><AppText muted
                                                                                                                                style={styles.rowCaption}>{!active ? "Inactive" : user ? "View tracking list" : rank?.percent == null ? "Percentile unavailable" : `Top ${formatPercent(rank.percent)}`}</AppText></View>
                    <AppText style={styles.sheetValue}>{!active || value == null ? "—" : `${user ? "Lvl. " : "#"}${value}`}</AppText><ChevronRight size={16} color={colors.muted}/>
                </Pressable>;
            })}
        </View>
    </ActionSheet>;
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    controls: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    context: { paddingHorizontal: 20, paddingTop: 3, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", gap: 8 },
    contextLabel: { fontSize: 12, lineHeight: 18 },
    allTime: { flexDirection: "row", alignItems: "center", gap: 5 },
    search: { paddingHorizontal: 16, paddingBottom: 16 },
    iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
    list: { paddingHorizontal: 16, paddingBottom: 20 },
    listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 18, paddingBottom: 10 },
    sectionTitle: { fontSize: 16, lineHeight: 22 },
    podium: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        paddingTop: 14,
        paddingBottom: 18,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    podiumPerson: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
    runnerUp: { paddingTop: 24 },
    crown: { height: 23, alignItems: "center", justifyContent: "center" },
    medal: {
        position: "absolute",
        bottom: -5,
        alignSelf: "center",
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 3,
        borderColor: colors.background,
        alignItems: "center",
        justifyContent: "center"
    },
    medalLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", color: colors.background },
    podiumName: { fontSize: 13, fontWeight: "600", marginTop: 9, maxWidth: "100%", color: colors.muted },
    podiumLevel: { fontSize: 12, lineHeight: 18, fontWeight: "600", fontVariant: ["tabular-nums"] },
    row: {
        minHeight: 72,
        paddingHorizontal: 8,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    ownRow: { backgroundColor: `${colors.accent}10`, borderRadius: 10 },
    rankNumber: { width: 34, fontSize: 12, fontVariant: ["tabular-nums"], textAlign: "center" },
    initialAvatar: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondary },
    rowIdentity: { flex: 1, minWidth: 0, gap: 2 },
    rowName: { fontSize: 15, fontWeight: "600" },
    rowCaption: { fontSize: 11, lineHeight: 16 },
    rowMetric: { alignItems: "flex-end", gap: 1 },
    rowLevel: { fontSize: 19, lineHeight: 25, fontWeight: "700", fontVariant: ["tabular-nums"] },
    levelLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.6, fontWeight: "600" },
    you: { color: colors.accent, fontSize: 10, lineHeight: 15, fontWeight: "600" },
    dock: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
    personal: {
        minHeight: 68,
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: `${colors.accent}0D`
    },
    personalIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.surface },
    personalTitle: { fontSize: 13, lineHeight: 19, fontWeight: "700" },
    personalRank: { color: colors.accent, fontSize: 22, lineHeight: 28, fontWeight: "700", fontVariant: ["tabular-nums"] },
    sheetProfile: { flex: 1, minHeight: 54, flexDirection: "row", gap: 14, alignItems: "center" },
    profileLink: { color: colors.accent, fontSize: 12, lineHeight: 18, fontWeight: "600" },
    sheetDescription: { fontSize: 12, lineHeight: 18 },
    sheetRow: {
        minHeight: 66,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        paddingVertical: 10
    },
    sheetIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12 },
    sheetValue: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
    inactive: { opacity: 0.4 },
    pressed: { opacity: 0.6 },
});
