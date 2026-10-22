import { ProfileQueryPanel } from "./ProfileQueryPanel";
import { useProfileScroll } from "../../hooks/use-profile-scroll";
import { useMemo, useState } from "react";
import { useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Animated, Pressable, RefreshControl, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors } from "../../theme";
import { mediaLabels } from "../../lib/media";
import { useTabPush } from "../../hooks/use-tab-push";
import { calendarOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Cover, Select, StateView } from "../../components/ui";
import { shiftDateInputValue, toDateInputValue } from "@/lib/utils/formatting/date";

export function CalendarContent() {
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useProfileScroll();
    const push = useTabPush();
    const [month, setMonth] = useState(() => `${toDateInputValue(new Date()).slice(0, 7)}-01`);
    const [mediaType, setMediaType] = useState("all");
    const range = { startDate: month, endDate: shiftDateInputValue(month, { months: 1, days: -1 }) };
    const query = useQuery({ ...calendarOptions(range), enabled: focused });
    const sections = useMemo(() => {
        const grouped = new Map<string, NonNullable<typeof query.data>["items"]>();
        for (const item of query.data?.items ?? []) {
            if (mediaType !== "all" && mediaType !== item.mediaType) continue;
            const day = item.date.slice(0, 10);
            if (!grouped.has(day)) grouped.set(day, []);
            grouped.get(day)!.push(item);
        }
        return Array.from(grouped, ([title, data]) => ({ title, data }));
    }, [query.data, mediaType]);

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
                                        onPress={() => setMonth(shiftDateInputValue(month, { months: -1 }))}
                                    >
                                        <ChevronLeft size={22} color={colors.text} />
                                    </Pressable>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Return to this month"
                                        onPress={() => setMonth(`${toDateInputValue(new Date()).slice(0, 7)}-01`)}
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
                                        onPress={() => setMonth(shiftDateInputValue(month, { months: 1 }))}
                                    >
                                        <ChevronRight size={22} color={colors.text} />
                                    </Pressable>
                                </View>
                                <Select
                                    label="Releases from your lists"
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
                                title="No releases this month"
                                message="Upcoming releases from your tracked titles will appear here."
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
