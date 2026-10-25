import { ProfileQueryPanel } from "./ProfileQueryPanel";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { useMemo, useState } from "react";
import { useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Animated, Pressable, RefreshControl, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors } from "../../theme";
import { mediaLabels } from "../../lib/media";
import { useTabPush } from "../../hooks/use-tab-push";
import { calendarOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Cover, StateView } from "../../components/ui";
import { FilterButtons } from "../../components/filter-buttons";
import { shiftDateInputValue, toDateInputValue } from "@/lib/utils/formatting/date";

export function CalendarContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    const [month, setMonth] = useState(() => `${toDateInputValue(new Date()).slice(0, 7)}-01`);
    const [selectedDay, setDay] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState("all");
    const range = { startDate: month, endDate: shiftDateInputValue(month, { months: 1, days: -1 }) };
    const query = useQuery({ ...calendarOptions(range, userId), enabled: focused });
    const sections = useMemo(() => {
        const grouped = new Map<string, NonNullable<typeof query.data>["items"]>();
        for (const item of query.data?.items ?? []) {
            if (selectedDay && item.date.slice(0, 10) !== selectedDay) continue;
            if (mediaType !== "all" && mediaType !== item.mediaType) continue;
            const day = item.date.slice(0, 10);
            if (!grouped.has(day)) grouped.set(day, []);
            grouped.get(day)!.push(item);
        }
        return Array.from(grouped, ([title, data]) => ({ title, data }));
    }, [query.data, mediaType, selectedDay]);

    return (
        <>
            <ProfileQueryPanel query={query}>
                {() => (
                    <Animated.SectionList
                        {...scrollProps}
                        contentContainerStyle={contentContainerStyle}
                        stickySectionHeadersEnabled={false}
                        ListHeaderComponent={
                            <View style={{ padding: 16, gap: 12 }}>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Previous month"
                                        hitSlop={8}
                                        style={{ padding: 8 }}
                                        onPress={() => {
                                            setMonth(shiftDateInputValue(month, { months: -1 }));
                                            setDay(null);
                                        }}
                                    >
                                        <ChevronLeft size={22} color={colors.text} />
                                    </Pressable>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Return to this month"
                                        onPress={() => {
                                            setMonth(`${toDateInputValue(new Date()).slice(0, 7)}-01`);
                                            setDay(null);
                                        }}
                                    >
                                        <AppText heading style={{ fontSize: 17 }}>
                                            {new Date(`${month}T00:00:00Z`).toLocaleDateString(undefined, {
                                                month: "long",
                                                year: "numeric",
                                                timeZone: "UTC",
                                            })}
                                        </AppText>
                                    </Pressable>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Next month"
                                        hitSlop={8}
                                        style={{ padding: 8 }}
                                        onPress={() => {
                                            setMonth(shiftDateInputValue(month, { months: 1 }));
                                            setDay(null);
                                        }}
                                    >
                                        <ChevronRight size={22} color={colors.text} />
                                    </Pressable>
                                </View>
                                <View style={{ gap: 6 }}>
                                    <View style={{ flexDirection: "row" }}>
                                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                                            <AppText
                                                key={label}
                                                muted
                                                style={{ width: "14.2857%", textAlign: "center", fontSize: 11 }}
                                            >
                                                {label}
                                            </AppText>
                                        ))}
                                    </View>
                                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                                        {Array.from(
                                            { length: (new Date(`${month}T00:00:00Z`).getUTCDay() + 6) % 7 },
                                            (_, index) => (
                                                <View
                                                    key={`blank:${index}`}
                                                    style={{ width: "14.2857%", height: 44 }}
                                                />
                                            ),
                                        )}
                                        {Array.from(
                                            { length: new Date(`${range.endDate}T00:00:00Z`).getUTCDate() },
                                            (_, index) => {
                                                const date = `${month.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`;
                                                const count = query.data!.items.filter(
                                                    (item) =>
                                                        item.date.slice(0, 10) === date &&
                                                        (mediaType === "all" || item.mediaType === mediaType),
                                                ).length;
                                                return (
                                                    <Pressable
                                                        key={date}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`${date}, ${count} releases`}
                                                        accessibilityState={{ selected: selectedDay === date }}
                                                        onPress={() => setDay(selectedDay === date ? null : date)}
                                                        style={{
                                                            width: "14.2857%",
                                                            minHeight: 44,
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 2,
                                                            borderRadius: 10,
                                                            backgroundColor:
                                                                selectedDay === date ? colors.primary : "transparent",
                                                        }}
                                                    >
                                                        <AppText
                                                            style={{ fontSize: 13, fontWeight: count ? "700" : "400" }}
                                                        >
                                                            {index + 1}
                                                        </AppText>
                                                        <View
                                                            style={{
                                                                width: 4,
                                                                height: 4,
                                                                borderRadius: 2,
                                                                backgroundColor: count ? colors.accent : "transparent",
                                                            }}
                                                        />
                                                    </Pressable>
                                                );
                                            },
                                        )}
                                    </View>
                                    {selectedDay && (
                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => setDay(null)}
                                            style={{ padding: 10, alignSelf: "center" }}
                                        >
                                            <AppText style={{ color: colors.accent, fontSize: 12 }}>
                                                Show all releases this month
                                            </AppText>
                                        </Pressable>
                                    )}
                                </View>
                                <FilterButtons
                                    label="Releases from tracked lists"
                                    value={mediaType}
                                    onChange={setMediaType}
                                    options={[
                                        { value: "all", label: "All media" },
                                        ...(query.data?.mediaTypes ?? []).map((value) => ({
                                            value,
                                            label: mediaLabels[value],
                                        })),
                                    ]}
                                />
                            </View>
                        }
                        sections={sections}
                        initialNumToRender={12}
                        windowSize={7}
                        keyExtractor={(item) =>
                            `${item.mediaType}:${item.mediaId}:${item.date}:${item.seasonToAir}:${item.episodeToAir}`
                        }
                        refreshControl={
                            <RefreshControl
                                tintColor={colors.accent}
                                refreshing={query.isRefetching}
                                onRefresh={() => void query.refetch()}
                            />
                        }
                        ListEmptyComponent={
                            <StateView
                                title={selectedDay ? "No releases on this day" : "No releases this month"}
                                message="Upcoming releases from tracked titles will appear here."
                            />
                        }
                        renderSectionHeader={({ section }) => (
                            <View style={{ padding: 16, backgroundColor: colors.background }}>
                                <AppText heading style={{ fontSize: 14 }}>
                                    {new Date(`${section.title}T00:00:00Z`).toLocaleDateString(undefined, {
                                        weekday: "long",
                                        month: "short",
                                        day: "numeric",
                                        timeZone: "UTC",
                                    })}
                                </AppText>
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() =>
                                    push({
                                        pathname: "/media/[mediaType]/[mediaId]",
                                        params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                                    })
                                }
                                style={({ pressed }) => ({
                                    padding: 16,
                                    gap: 12,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    opacity: pressed ? 0.6 : 1,
                                })}
                            >
                                <Cover uri={item.cover} label={item.mediaName} />
                                <View style={{ flex: 1, gap: 6 }}>
                                    <AppText style={{ fontWeight: "600" }}>{item.mediaName}</AppText>
                                    <AppText muted>
                                        {mediaLabels[item.mediaType]} · {item.status}
                                    </AppText>
                                    {item.episodeToAir != null && (
                                        <AppText muted>
                                            Season {item.seasonToAir} · Episode {item.episodeToAir}
                                        </AppText>
                                    )}
                                </View>
                            </Pressable>
                        )}
                    />
                )}
            </ProfileQueryPanel>
        </>
    );
}
