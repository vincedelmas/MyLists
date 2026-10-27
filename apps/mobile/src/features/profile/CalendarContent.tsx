import {useMemo, useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Animated, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X} from "lucide-react-native";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {formatDate, formatMonthYear, shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";
import {zeroPad} from "@/lib/utils/formatting/number";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {useTabPush} from "../../hooks/use-tab-push";
import {calendarOptions} from "../../lib/react-query/query-options/profile.options";
import {AppText, Cover, StateView} from "../../components/ui";
import {ChoiceChips} from "../../components/choice-chips";
import {mediaColors, mediaIcons, mediaLabels} from "../../lib/media";
import {colors, statusColors} from "../../theme";

export function CalendarContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    const today = toDateInputValue(new Date());
    const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`);
    const [selectedDay, setDay] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [mediaType, setMediaType] = useState("all");
    const range = { startDate: month, endDate: shiftDateInputValue(month, { months: 1, days: -1 }) };
    const query = useQuery({ ...calendarOptions(range, userId), enabled: focused });
    const grouped = useMemo(() => {
        const sections = new Map<string, NonNullable<typeof query.data>["items"]>();
        const counts = new Map<string, number>();
        for (const item of query.data?.items ?? []) {
            counts.set(item.mediaType, (counts.get(item.mediaType) ?? 0) + 1);
            if (mediaType !== "all" && mediaType !== item.mediaType) continue;
            const day = item.date.slice(0, 10);
            if (!sections.has(day)) sections.set(day, []);
            sections.get(day)!.push(item);
        }
        return { counts, sections };
    }, [query.data, mediaType]);
    const sections = useMemo(() => Array.from(grouped.sections, ([title, data]) => ({
        title,
        data
    })).filter(section => !selectedDay || section.title === selectedDay), [grouped, selectedDay]);
    const selectMonth = (value: string) => {
        setMonth(value);
        setDay(null);
    };
    const CalendarIcon = expanded ? ChevronUp : ChevronDown;
    return <Animated.SectionList {...scrollProps} sections={sections} stickySectionHeadersEnabled={false} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
                                 contentContainerStyle={[contentContainerStyle, styles.content]}
                                 keyExtractor={item => `${item.mediaType}:${item.mediaId}:${item.date}:${item.seasonToAir}:${item.episodeToAir}`}
                                 refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}/>}
                                 ListHeaderComponent={<View style={styles.header}>
                                     <View style={styles.monthRow}>
                                         <Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={styles.iconButton}
                                                    onPress={() => selectMonth(shiftDateInputValue(month, { months: -1 }))}><ChevronLeft size={22}
                                                                                                                                         color={colors.muted}/></Pressable>
                                         <Pressable accessibilityRole="button" accessibilityLabel="Return to this month" style={styles.monthTitle}
                                                    onPress={() => selectMonth(`${today.slice(0, 7)}-01`)}><AppText heading
                                                                                                                    style={styles.monthLabel}>{formatMonthYear(month, { month: "long" })}</AppText></Pressable>
                                         <Pressable accessibilityRole="button" accessibilityLabel="Next month" style={styles.iconButton}
                                                    onPress={() => selectMonth(shiftDateInputValue(month, { months: 1 }))}><ChevronRight size={22}
                                                                                                                                         color={colors.muted}/></Pressable>
                                     </View>
                                     <View style={styles.calendarActions}><Pressable accessibilityRole="button" onPress={() => {
                                         selectMonth(`${today.slice(0, 7)}-01`);
                                         setDay(today);
                                     }} style={styles.today}><AppText style={styles.actionText}>Today</AppText></Pressable>
                                         <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
                                                    accessibilityLabel={expanded ? "Hide month calendar" : "Show month calendar"} onPress={() => setExpanded(value => !value)}
                                                    style={styles.calendarToggle}><CalendarDays size={17} color={colors.accent}/><AppText
                                             style={styles.actionText}>Calendar</AppText><CalendarIcon size={15} color={colors.accent}/></Pressable>
                                     </View>
                                     {expanded && <View style={styles.calendar}>
                                         <View style={styles.weekdays}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <AppText key={day} muted
                                                                                                                                              style={styles.weekday}>{day}</AppText>)}</View>
                                         <View style={styles.days}>
                                             {Array.from({ length: (new Date(`${month}T00:00:00Z`).getUTCDay() + 6) % 7 }, (_, i) => <View key={`blank:${i}`} style={styles.day}/>)}
                                             {Array.from({ length: Number(range.endDate.slice(-2)) }, (_, index) => {
                                                 const date = `${month.slice(0, 7)}-${zeroPad(index + 1)}`;
                                                 const count = grouped.sections.get(date)?.length ?? 0;
                                                 return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${formatDate(date)}, ${count} releases`}
                                                                   accessibilityState={{ selected: selectedDay === date }} onPress={() => {
                                                     setDay(selectedDay === date ? null : date);
                                                     setExpanded(false);
                                                 }} style={[styles.day, date === today && styles.currentDay, selectedDay === date && styles.selectedDay]}><AppText
                                                     style={[styles.dayNumber, count > 0 && styles.hasReleases]}>{index + 1}</AppText><View
                                                     style={[styles.dot, { backgroundColor: count ? colors.accent : "transparent" }]}/></Pressable>;
                                             })}
                                         </View>
                                     </View>}
                                     <ChoiceChips label="Release media types" value={mediaType} onChange={setMediaType} options={[{
                                         value: "all",
                                         label: `All (${query.data?.items.length ?? 0})`
                                     }, ...ALL_MEDIA_TYPES.filter(type => query.data?.mediaTypes.some(active => active === type)).map(value => ({
                                         value,
                                         label: `${mediaLabels[value]} (${grouped.counts.get(value) ?? 0})`,
                                         color: mediaColors[value]
                                     }))]}/>
                                     {selectedDay && <Pressable accessibilityRole="button" accessibilityLabel="Show all releases this month" style={styles.selection}
                                                                onPress={() => setDay(null)}><AppText style={styles.actionText}>{formatDate(selectedDay)}</AppText><X size={16}
                                                                                                                                                                      color={colors.accent}/></Pressable>}
                                     <View style={styles.agendaHeading}><AppText heading style={styles.agendaTitle}>Your releases</AppText><AppText muted
                                                                                                                                                    style={styles.caption}>{sections.reduce((total, section) => total + section.data.length, 0)} releases</AppText></View>
                                 </View>}
                                 renderSectionHeader={({ section }) => <View style={styles.dateHeading}><AppText
                                     style={styles.dateTitle}>{section.title === today ? "Today · " : ""}{new Date(`${section.title}T00:00:00Z`).toLocaleDateString("en-US", {
                                     weekday: "long",
                                     month: "short",
                                     day: "numeric",
                                     timeZone: "UTC"
                                 })}</AppText></View>}
                                 renderItem={({ item }) => {
                                     const Icon = mediaIcons[item.mediaType];
                                     const color = mediaColors[item.mediaType];
                                     return <Pressable accessibilityRole="button" accessibilityLabel={`${item.mediaName}, ${formatDate(item.date)}`} onPress={() => push({
                                         pathname: "/media/[mediaType]/[mediaId]",
                                         params: { mediaType: item.mediaType, mediaId: item.mediaId }
                                     })} style={({ pressed }) => [styles.release, pressed && styles.pressed]}>
                                         <Cover uri={item.cover} label={item.mediaName} style={styles.cover}/><View style={styles.identity}><View style={styles.type}><Icon
                                         size={13} color={color}/><AppText style={[styles.mediaLabel, { color }]}>{mediaLabels[item.mediaType]}</AppText></View><AppText
                                         numberOfLines={2} style={styles.name}>{item.mediaName}</AppText><AppText
                                         style={styles.releaseLabel}>{item.episodeToAir != null ? `S${zeroPad(item.seasonToAir)}.E${zeroPad(item.episodeToAir)}` : item.mediaType === "games" ? "Game release" : "Movie release"}</AppText><AppText
                                         style={[styles.status, { color: statusColors[item.status] }]}>{item.status}</AppText></View>
                                     </Pressable>;
                                 }}
                                 ListEmptyComponent={<StateView loading={query.isPending}
                                                                title={query.error ? "Couldn’t load releases" : selectedDay ? "No releases on this day" : "No releases this month"}
                                                                message={query.error?.message ?? "Upcoming releases from your tracked titles will appear here."}
                                                                retry={query.error ? () => void query.refetch() : undefined}/>}
                                 ListFooterComponent={query.error && sections.length ?
                                     <StateView title="Couldn’t refresh releases" message={query.error.message} retry={() => void query.refetch()}/> : undefined}/>;
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 28 },
    header: { gap: 12 },
    monthRow: { flexDirection: "row", alignItems: "center" },
    iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
    monthTitle: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" },
    monthLabel: { fontSize: 21, lineHeight: 29, textAlign: "center" },
    calendarActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    today: { minHeight: 48, paddingHorizontal: 14, justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: colors.border },
    actionText: { fontSize: 12, lineHeight: 18, color: colors.accent },
    calendarToggle: { minHeight: 48, flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 10 },
    calendar: { gap: 10, padding: 8, borderRadius: 16, backgroundColor: colors.surface },
    weekdays: { flexDirection: "row" },
    weekday: { width: "14.2857%", textAlign: "center", fontSize: 10 },
    days: { flexDirection: "row", flexWrap: "wrap" },
    day: { width: "14.2857%", minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 3 },
    currentDay: { borderWidth: 1, borderColor: colors.accent },
    selectedDay: { backgroundColor: colors.primary },
    dayNumber: { fontSize: 13 },
    hasReleases: { fontWeight: "700" },
    dot: { width: 4, height: 4, borderRadius: 2 },
    selection: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        gap: 10,
        borderRadius: 14,
        backgroundColor: colors.surface
    },
    agendaHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, paddingTop: 6 },
    agendaTitle: { fontSize: 18 },
    caption: { fontSize: 12 },
    dateHeading: { paddingTop: 20, paddingBottom: 10 },
    dateTitle: { fontSize: 13, lineHeight: 19, color: colors.muted },
    release: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 14,
        marginBottom: 10,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border
    },
    cover: { width: 72, height: 108, borderRadius: 10 },
    identity: { flex: 1, minWidth: 0, gap: 6 },
    type: { flexDirection: "row", alignItems: "center", gap: 5 },
    mediaLabel: { fontSize: 10 },
    name: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
    releaseLabel: { fontSize: 12, lineHeight: 18 },
    status: { fontSize: 11, lineHeight: 17 },
    pressed: { opacity: 0.6 },
});
