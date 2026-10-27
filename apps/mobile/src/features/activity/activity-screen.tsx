import {SearchField} from "../../components/search-field";
import {useCallback, useMemo, useRef, useState} from "react";
import {useIsFocused} from "expo-router";
import {useInfiniteQuery, useQuery, useQueryClient} from "@tanstack/react-query";
import {FlatList, Platform, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal, X} from "lucide-react-native";
import {formatMonth} from "@/lib/utils/formatting/date";
import {formatNumber} from "@/lib/utils/formatting/number";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {useTabPush} from "../../hooks/use-tab-push";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import type {MonthlyActivityInput} from "../../lib/api-client";
import {monthlyActivityOptions, monthlyActivityStatsOptions} from "../../lib/react-query/query-options/activity.options";
import {AppText, Button, QueryPanel, StateView} from "../../components/ui";
import {ChoiceChips} from "../../components/choice-chips";
import {LayoutToggle, type MediaLayout} from "../../components/layout-toggle";
import {NativeHost} from "../../components/native-host";
import {SelectControl} from "../../components/select-control";
import {mediaLabels, mediaColors} from "../../lib/media";
import {colors} from "../../theme";
import {ActivityCard} from "./activity-card";
import {ActivitySummary} from "./activity-summary";
import {ActivityEditor} from "./activity-editor";
import {ActivityFilterSheet, ActivityPeriodSheet} from "./activity-controls";
import {ActivityOccurrences} from "./activity-occurrences";
import {activityKinds, activitySorts, isFutureActivityPeriod, shiftActivityPeriod, type ActivityPeriod, type ActivityRow} from "./activity-utils";

type Sheet = { kind: "period" | "filters" | "add" } | { kind: "edit" | "occurrences"; row: ActivityRow };
const periodModes = [{ value: "month", label: "Month", icon: CalendarDays }, { value: "year", label: "Year", icon: CalendarRange }] as const;

export function ActivityContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const client = useQueryClient();
    const push = useTabPush();
    const list = useRef<FlatList<ActivityRow>>(null);
    const [period, setPeriod] = useState<ActivityPeriod>(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1, view: "month" };
    });
    const [filters, setFilters] = useState<Pick<MonthlyActivityInput, "activeTab" | "activityKind" | "hiddenOnly" | "sort">>({
        activeTab: "all",
        activityKind: "all",
        hiddenOnly: false,
        sort: "latest"
    });
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const searching = term !== search.trim();
    const [layout, setLayout] = useState<MediaLayout>("list");
    const [sheet, setSheet] = useState<Sheet | null>(null);
    const query = useInfiniteQuery({ ...monthlyActivityOptions({ ...period, ...filters, search: term || undefined }, userId), enabled: focused && !searching });
    const stats = useQuery({ ...monthlyActivityStatsOptions(period, userId), enabled: focused });
    const first = query.data?.pages[0];
    const rows = useMemo(() => searching ? [] : query.data?.pages.flatMap(page => page.items) ?? [], [query.data, searching]);
    const canEdit = first?.canEdit ?? !userId;
    const changeFilters = (next: Partial<typeof filters>) => {
        setFilters(previous => ({ ...previous, ...next }));
        list.current?.scrollToOffset({ offset: 0, animated: false });
    };
    const changePeriod = (next: ActivityPeriod) => {
        const now = new Date();
        setPeriod({ ...next, month: next.year === now.getFullYear() ? Math.min(next.month, now.getMonth() + 1) : next.month });
        setFilters(previous => ({ ...previous, activeTab: "all" }));
        list.current?.scrollToOffset({ offset: 0, animated: false });
    };
    const open = useCallback((row: ActivityRow) => push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType: row.mediaType, mediaId: row.mediaId } }), [push]);
    const manage = useCallback((row: ActivityRow) => setSheet({ kind: period.view === "year" ? "occurrences" : "edit", row }), [period.view]);
    const renderItem = useCallback(({ item }: { item: ActivityRow }) => <ActivityCard row={item} layout={layout} view={period.view} canEdit={canEdit} onOpen={open}
                                                                                      onManage={manage}/>, [layout, period.view, canEdit, open, manage]);
    const periodLabel = period.view === "year" ? String(period.year) : `${formatMonth(period.month)} ${period.year}`;
    const filterCount = Number(filters.activityKind !== "all") + Number(filters.hiddenOnly);
    const filtered = !!term || filters.activeTab !== "all" || filterCount > 0;
    const previous = shiftActivityPeriod(period, -1);
    const next = shiftActivityPeriod(period, 1);

    return <>
        <View style={styles.navigation}>
            <View style={styles.periodRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Previous ${period.view}`} disabled={previous.year < 1900} onPress={() => changePeriod(previous)}
                           style={({ pressed }) => [styles.arrow, previous.year < 1900 && styles.disabled, pressed && styles.pressed]}><ChevronLeft size={22} color={colors.muted}/></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Choose activity period, ${periodLabel}`} onPress={() => setSheet({ kind: "period" })}
                           style={({ pressed }) => [styles.period, pressed && styles.pressed]}><AppText heading style={styles.periodTitle}>{periodLabel}</AppText><ChevronDown
                    size={17} color={colors.accent}/></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Next ${period.view}`} disabled={isFutureActivityPeriod(next)} onPress={() => changePeriod(next)}
                           style={({ pressed }) => [styles.arrow, isFutureActivityPeriod(next) && styles.disabled, pressed && styles.pressed]}><ChevronRight size={22}
                                                                                                                                                             color={colors.muted}/></Pressable>
            </View>
            <ChoiceChips options={periodModes} value={period.view} label="Activity period" onChange={view => changePeriod({ ...period, view })}/>
        </View>
        <FlatList ref={list} key={layout} data={rows} numColumns={layout === "grid" ? 2 : 1} renderItem={renderItem} keyExtractor={item => `${item.mediaType}:${item.id}`}
                  initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
                  contentContainerStyle={styles.content}
                  refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching && !query.isFetchingNextPage}
                                                  onRefresh={() => void client.invalidateQueries({ queryKey: ["monthly-activity", userId] })}/>}
                  onEndReachedThreshold={0.5} onEndReached={() => {
            if (focused && !searching && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage();
        }}
                  ListHeaderComponent={<View style={styles.header}>
                      <View style={styles.inset}><QueryPanel query={stats}>{data => <ActivitySummary data={data} selected={filters.activeTab}
                                                                                                     onSelect={activeTab => changeFilters({ activeTab })}/>}</QueryPanel></View>
                      <View style={[styles.inset, styles.searchRow]}><View style={styles.searchField}><SearchField label="Search recorded activity" hideLabel clearable
                                                                                                                   leadingIcon={<Search size={19} color={colors.muted}/>}
                                                                                                                   value={search}
                                                                                                                   onChangeText={value => {
                                                                                                                       setSearch(value);
                                                                                                                       list.current?.scrollToOffset({ offset: 0, animated: false });
                                                                                                                   }} placeholder="Search activity…" autoCorrect={false}
                                                                                                                   returnKeyType="search"/></View>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Filter activity${filterCount ? `, ${filterCount} active` : ""}`}
                                     onPress={() => setSheet({ kind: "filters" })}
                                     style={({ pressed }) => [styles.filter, filterCount > 0 && styles.activeFilter, pressed && styles.pressed]}><SlidersHorizontal size={19}
                                                                                                                                                                    color={filterCount ? colors.accent : colors.muted}/>{filterCount > 0 &&
                              <AppText style={styles.filterLabel}>{filterCount}</AppText>}</Pressable>
                      </View>
                      <ChoiceChips value={filters.activeTab} label="Media type" options={[{
                          value: "all" as const,
                          label: "All types"
                      }, ...ALL_MEDIA_TYPES.filter(type => first?.mediaTypes.includes(type)).map(value => ({ value, label: mediaLabels[value], color: mediaColors[value] }))]}
                                   onChange={activeTab => changeFilters({ activeTab })}/>
                      {filtered && <View style={styles.applied}>
                          {filters.activeTab !== "all" &&
                              <Pressable accessibilityRole="button" accessibilityLabel="Remove media type filter" onPress={() => changeFilters({ activeTab: "all" })}
                                         style={styles.appliedChip}><AppText style={styles.appliedLabel}>{mediaLabels[filters.activeTab]}</AppText><X size={12}
                                                                                                                                                      color={colors.muted}/></Pressable>}
                          {term &&
                              <Pressable accessibilityRole="button" accessibilityLabel="Clear activity search" onPress={() => setSearch("")} style={styles.appliedChip}><AppText
                                  numberOfLines={1} style={styles.appliedLabel}>{term}</AppText><X size={12} color={colors.muted}/></Pressable>}
                          {filters.activityKind !== "all" &&
                              <Pressable accessibilityRole="button" accessibilityLabel="Remove activity kind filter" onPress={() => changeFilters({ activityKind: "all" })}
                                         style={styles.appliedChip}><AppText
                                  style={styles.appliedLabel}>{activityKinds.find(item => item.value === filters.activityKind)!.label}</AppText><X size={12} color={colors.muted}/></Pressable>}
                          {filters.hiddenOnly &&
                              <Pressable accessibilityRole="button" accessibilityLabel="Remove hidden-only filter" onPress={() => changeFilters({ hiddenOnly: false })}
                                         style={styles.appliedChip}><AppText style={styles.appliedLabel}>Hidden only</AppText><X size={12} color={colors.muted}/></Pressable>}
                          <Pressable accessibilityRole="button" onPress={() => {
                              setSearch("");
                              changeFilters({ activeTab: "all", activityKind: "all", hiddenOnly: false });
                          }} style={styles.reset}><AppText style={styles.resetLabel}>Reset filters</AppText></Pressable>
                          <AppText muted style={styles.filterNote}>Stats cover all visible media in this period. Filters apply to the results below.</AppText>
                      </View>}
                      <View style={styles.resultsHeading}><AppText heading
                                                                   style={styles.sectionTitle}>{filters.hiddenOnly ? "Hidden summaries" : period.view === "year" ? "Yearly summaries" : "Monthly summaries"}</AppText><AppText
                          muted
                          style={styles.caption}>{searching ? "Searching…" : first ? `${formatNumber(first.total, { locale: "en" })} ${first.total === 1 ? "title" : "titles"}` : "Loading…"}</AppText></View>
                      <View style={styles.resultControls}><NativeHost matchContents={false} style={styles.sortControl}><SelectControl value={filters.sort} options={activitySorts}
                                                                                                                                      onChange={sort => changeFilters({ sort })}/></NativeHost><LayoutToggle
                          value={layout}
                          onChange={setLayout}/></View>
                  </View>}
                  ListEmptyComponent={<StateView loading={query.isPending || searching}
                                                 title={query.error ? "Couldn’t load activity" : filtered ? "No matching summaries" : `No activity recorded this ${period.view}`}
                                                 message={query.error?.message ?? (filtered ? "Try another title or reset the filters." : canEdit ? "Track media normally or add a summary for this period." : "Recorded media activity will appear here.")}
                                                 retry={query.error ? () => void query.refetch() : undefined}/>}
                  ListFooterComponent={query.isFetchingNextPage ? <StateView loading/> : query.error && rows.length ?
                      <StateView title="Couldn’t load activity" retry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}/> : undefined}/>
        {canEdit && (Platform.OS === "ios" ? <View style={styles.addDock}><Button label="Add activity" disabled={!first} onPress={() => setSheet({ kind: "add" })}/></View> :
            <Pressable accessibilityRole="button" accessibilityLabel="Add activity" disabled={!first} onPress={() => setSheet({ kind: "add" })}
                       style={({ pressed }) => [styles.addButton, !first && styles.disabled, pressed && styles.pressed]}><Plus size={25} color={colors.accentText}/></Pressable>)}
        {sheet?.kind === "period" && <ActivityPeriodSheet period={period} dismiss={() => setSheet(null)} onSelect={value => {
            setSheet(null);
            changePeriod(value);
        }}/>}
        {sheet?.kind === "filters" && <ActivityFilterSheet filters={filters} canEdit={canEdit} onChange={changeFilters} dismiss={() => setSheet(null)}/>}
        {canEdit && (sheet?.kind === "add" || sheet?.kind === "edit") &&
            <ActivityEditor activity={sheet.kind === "edit" ? sheet.row : undefined} period={period} mediaTypes={first!.activeMediaTypes} dismiss={() => setSheet(null)}/>}
        {sheet?.kind === "occurrences" && <ActivityOccurrences row={sheet.row} dismiss={() => setSheet(null)} onMonth={bucket => {
            const [year, month] = bucket.split("-").map(Number);
            setSheet(null);
            setPeriod({ year, month, view: "month" });
            list.current?.scrollToOffset({ offset: 0, animated: false });
        }}/>}
    </>;
}

const styles = StyleSheet.create({
    navigation: { paddingTop: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    periodRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
    arrow: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
    period: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    periodTitle: { fontSize: 19, lineHeight: 27, textAlign: "center", flexShrink: 1 },
    content: { paddingHorizontal: 10, paddingBottom: 88 },
    header: { paddingTop: 16, paddingBottom: 0, gap: 10 },
    inset: { paddingHorizontal: 6, gap: 12 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    searchField: { flex: 1 },
    filter: {
        minWidth: 48,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border
    },
    activeFilter: { borderColor: colors.primary, backgroundColor: `${colors.accent}10` },
    filterLabel: { fontSize: 12, lineHeight: 18 },
    resultsHeading: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 6 },
    sortControl: { height: 48, flex: 1 },
    resultControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 6 },
    sectionTitle: { fontSize: 17, lineHeight: 24 },
    caption: { fontSize: 12, lineHeight: 18 },
    applied: { paddingHorizontal: 6, flexDirection: "row", flexWrap: "wrap", gap: 8 },
    appliedChip: {
        minHeight: 48,
        maxWidth: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border
    },
    appliedLabel: { fontSize: 11, lineHeight: 16, flexShrink: 1 },
    reset: { minHeight: 48, justifyContent: "center", paddingHorizontal: 4 },
    resetLabel: { fontSize: 12, color: colors.accent },
    filterNote: { width: "100%", fontSize: 11, lineHeight: 17 },
    addDock: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    addButton: {
        position: "absolute",
        right: 16,
        bottom: 16,
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px #0006"
    },
    disabled: { opacity: 0.25 },
    pressed: { opacity: 0.6 },
});
