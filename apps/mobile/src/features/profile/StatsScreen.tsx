import { ProfileQueryPanel } from "./ProfileQueryPanel";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { useState } from "react";
import { useIsFocused } from "expo-router";
import type { api } from "../../lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { formatCount } from "./profile-formatting";
import { colors, statusColors } from "../../theme";
import { Animated, RefreshControl, View } from "react-native";
import { ProgressBar } from "../../components/ProgressBar";
import { mediaLabels, mediaColors } from "../../lib/media";
import { statsOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Section, uiStyles } from "../../components/ui";
import { FilterButtons } from "../../components/filter-buttons";

export function StatsContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const [tab, setTab] = useState<NonNullable<Parameters<typeof api.stats>[0]>>("overview");

    const query = useQuery({ ...statsOptions(tab, userId), enabled: focused });

    return (
        <>
            <ProfileQueryPanel query={query}>
                {(data) => {
                    const hours = data.kind === "overview" ? data.totalHours : data.timeSpentHours;
                    const monthlyMax = Math.max(1, ...data.activityByMonth.data.map((month) => month.total));
                    const metrics = [
                        ["Tracked titles", data.totalEntries],
                        ["Hours spent", hours],
                        ["Favorites", data.totalFavorites],
                        ["Rated", data.totalRated],
                        ["Re-experienced", data.totalRedo],
                        ["Notes", data.totalComments],
                    ] as const;

                    return (
                        <Animated.ScrollView
                            {...scrollProps}
                            contentContainerStyle={[{ padding: 16, gap: 24 }, contentContainerStyle]}
                            refreshControl={
                                <RefreshControl
                                    tintColor={colors.accent}
                                    refreshing={query.isRefetching}
                                    onRefresh={() => void query.refetch()}
                                />
                            }
                        >
                            <View>
                                <FilterButtons
                                    value={tab}
                                    label="Statistics for"
                                    onChange={setTab}
                                    options={[
                                        { value: "overview", label: "Overview" },
                                        ...(query.data?.activatedMediaTypes ?? (tab !== "overview" ? [tab] : [])).map(
                                            (type) => ({
                                                value: type,
                                                label: mediaLabels[type],
                                            }),
                                        ),
                                    ]}
                                />
                            </View>
                            <View
                                style={{
                                    gap: 1,
                                    borderRadius: 16,
                                    flexWrap: "wrap",
                                    overflow: "hidden",
                                    flexDirection: "row",
                                    backgroundColor: colors.border,
                                }}
                            >
                                {metrics.map(([label, value]) => (
                                    <View
                                        key={label}
                                        style={{
                                            gap: 4,
                                            padding: 18,
                                            flexGrow: 1,
                                            width: "49.8%",
                                            backgroundColor: colors.surface,
                                        }}
                                    >
                                        <AppText style={{ fontSize: 25, lineHeight: 32, fontWeight: "700" }}>
                                            {formatCount(value)}
                                        </AppText>
                                        <AppText muted style={{ fontSize: 12 }}>
                                            {label}
                                        </AppText>
                                    </View>
                                ))}
                            </View>
                            {data.kind === "overview" ? (
                                <>
                                    <Section title="Across media">
                                        {data.mediaBreakdown.map((item) => (
                                            <View key={item.mediaType} style={uiStyles.padded}>
                                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                                    <AppText
                                                        style={{
                                                            color: mediaColors[item.mediaType],
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        {mediaLabels[item.mediaType]}
                                                    </AppText>
                                                    <AppText muted>{formatCount(item.timeSpentHours)} hours</AppText>
                                                </View>
                                                <ProgressBar
                                                    color={mediaColors[item.mediaType]}
                                                    value={hours ? (item.timeSpentHours / hours) * 100 : 0}
                                                />
                                                <AppText muted style={{ fontSize: 12 }}>
                                                    {formatCount(item.totalEntries)} titles ·{" "}
                                                    {formatCount(item.totalFavorites)} favorites
                                                </AppText>
                                            </View>
                                        ))}
                                    </Section>
                                    <Section title="Milestones">
                                        <View style={uiStyles.padded}>
                                            <AppText>{data.platinumAchievements} platinum achievements</AppText>
                                            <AppText muted>{data.totalTags} tags across lists</AppText>
                                        </View>
                                    </Section>
                                </>
                            ) : (
                                <>
                                    <Section title="Status breakdown">
                                        <View style={uiStyles.padded}>
                                            {data.statusesCounts.map((status) => (
                                                <View key={status.name} style={{ gap: 6, marginBottom: 10 }}>
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            justifyContent: "space-between",
                                                        }}
                                                    >
                                                        <AppText>{status.name}</AppText>
                                                        <AppText muted>{formatCount(status.value)}</AppText>
                                                    </View>
                                                    <ProgressBar
                                                        color={statusColors[status.name] ?? colors.accent}
                                                        value={
                                                            data.totalEntries
                                                                ? (status.value / data.totalEntries) * 100
                                                                : 0
                                                        }
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    </Section>
                                    {Object.entries(data.specificMediaStats.affinityStats).map(
                                        ([key, values]) =>
                                            values.length > 0 && (
                                                <Section
                                                    key={key}
                                                    title={`Top ${key
                                                        .replace(/Stats$/, "")
                                                        .replace(/([a-z])([A-Z])/g, "$1 $2")
                                                        .replaceAll("_", " ")}`}
                                                >
                                                    <View style={uiStyles.padded}>
                                                        {values.slice(0, 8).map((item) => (
                                                            <View
                                                                key={item.name}
                                                                style={{
                                                                    gap: 12,
                                                                    flexDirection: "row",
                                                                    justifyContent: "space-between",
                                                                }}
                                                            >
                                                                <AppText style={{ flex: 1 }}>{item.name}</AppText>
                                                                <AppText muted>
                                                                    {item.metadata.entriesCount} titles
                                                                </AppText>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </Section>
                                            ),
                                    )}
                                </>
                            )}
                            <Section title={`Activity · ${data.activityByMonth.range.startMonth.slice(0, 4)}`}>
                                <View style={uiStyles.padded}>
                                    {data.activityByMonth.data.map((month) => (
                                        <View key={month.month} style={{ gap: 5 }}>
                                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                                <AppText muted>
                                                    {new Date(`${month.month}-01T00:00:00Z`).toLocaleDateString(
                                                        undefined,
                                                        { month: "short", timeZone: "UTC" },
                                                    )}
                                                </AppText>
                                                <AppText muted>{formatCount(month.total)} hours</AppText>
                                            </View>
                                            <ProgressBar value={(month.total / monthlyMax) * 100} />
                                        </View>
                                    ))}
                                </View>
                            </Section>
                        </Animated.ScrollView>
                    );
                }}
            </ProfileQueryPanel>
        </>
    );
}
