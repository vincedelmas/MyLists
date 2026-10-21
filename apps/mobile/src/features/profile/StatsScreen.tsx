import {useState} from "react";
import {useIsFocused} from "expo-router";
import {RefreshControl, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {AppText, Content, Page, QueryPanel, Section, Select, uiStyles} from "../../components/ui";
import {ProgressBar} from "../../components/ProgressBar";
import {statsOptions} from "../../lib/react-query/query-options/profile.options";
import {mediaLabels, mediaColors} from "../../lib/media";
import {colors, statusColors} from "../../theme";
import {formatCount} from "./profile-formatting";
import type {api} from "../../lib/api-client";

export function StatsScreen() {
    const [tab, setTab] = useState<NonNullable<Parameters<typeof api.stats>[0]>>("overview");
    const focused = useIsFocused();
    const query = useQuery({...statsOptions(tab), enabled: focused});
    return (
        <Page title="Statistics" subtitle="Your tracking, in perspective" back>
            <View style={{padding: 16}}>
                <Select
                    label="Statistics for"
                    value={tab}
                    options={[
                        {value: "overview", label: "Overview"},
                        ...(query.data?.activatedMediaTypes ?? (tab !== "overview" ? [tab] : [])).map((type) => ({
                            value: type,
                            label: mediaLabels[type],
                        })),
                    ]}
                    onChange={(value) => setTab(value as typeof tab)}
                />
            </View>
            <QueryPanel query={query}>
                {(data) => {
                    const hours = data.kind === "overview" ? data.totalHours : data.timeSpentHours;
                    const metrics = [
                        ["Tracked titles", data.totalEntries],
                        ["Hours spent", hours],
                        ["Favorites", data.totalFavorites],
                        ["Rated", data.totalRated],
                        ["Re-experienced", data.totalRedo],
                        ["Notes", data.totalComments],
                    ] as const;
                    const monthlyMax = Math.max(1, ...data.activityByMonth.data.map((month) => month.total));
                    return (
                        <Content
                            refreshControl={
                                <RefreshControl
                                    refreshing={query.isRefetching}
                                    onRefresh={() => void query.refetch()}
                                    tintColor={colors.accent}
                                />
                            }
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 1,
                                    backgroundColor: colors.border,
                                    borderRadius: 16,
                                    overflow: "hidden",
                                }}
                            >
                                {metrics.map(([label, value]) => (
                                    <View
                                        key={label}
                                        style={{
                                            width: "49.8%",
                                            flexGrow: 1,
                                            backgroundColor: colors.surface,
                                            padding: 18,
                                            gap: 4,
                                        }}
                                    >
                                        <AppText style={{fontSize: 25, lineHeight: 32, fontWeight: "700"}}>
                                            {formatCount(value)}
                                        </AppText>
                                        <AppText muted style={{fontSize: 12}}>
                                            {label}
                                        </AppText>
                                    </View>
                                ))}
                            </View>
                            {data.kind === "overview" ? (
                                <>
                                    <Section title="Across your media">
                                        {data.mediaBreakdown.map((item) => (
                                            <View key={item.mediaType} style={uiStyles.padded}>
                                                <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                                                    <AppText
                                                        style={{color: mediaColors[item.mediaType], fontWeight: "600"}}
                                                    >
                                                        {mediaLabels[item.mediaType]}
                                                    </AppText>
                                                    <AppText muted>{formatCount(item.timeSpentHours)} hours</AppText>
                                                </View>
                                                <ProgressBar
                                                    value={hours ? (item.timeSpentHours / hours) * 100 : 0}
                                                    color={mediaColors[item.mediaType]}
                                                />
                                                <AppText muted style={{fontSize: 12}}>
                                                    {formatCount(item.totalEntries)} titles ·{" "}
                                                    {formatCount(item.totalFavorites)} favorites
                                                </AppText>
                                            </View>
                                        ))}
                                    </Section>
                                    <Section title="Milestones">
                                        <View style={uiStyles.padded}>
                                            <AppText>{data.platinumAchievements} platinum achievements</AppText>
                                            <AppText muted>{data.totalTags} tags across your lists</AppText>
                                        </View>
                                    </Section>
                                </>
                            ) : (
                                <>
                                    <Section title="Status breakdown">
                                        <View style={uiStyles.padded}>
                                            {data.statusesCounts.map((status) => (
                                                <View key={status.name} style={{gap: 6, marginBottom: 10}}>
                                                    <View
                                                        style={{flexDirection: "row", justifyContent: "space-between"}}
                                                    >
                                                        <AppText>{status.name}</AppText>
                                                        <AppText muted>{formatCount(status.value)}</AppText>
                                                    </View>
                                                    <ProgressBar
                                                        value={
                                                            data.totalEntries
                                                                ? (status.value / data.totalEntries) * 100
                                                                : 0
                                                        }
                                                        color={statusColors[status.name] ?? colors.accent}
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
                                                                    flexDirection: "row",
                                                                    justifyContent: "space-between",
                                                                    gap: 12,
                                                                }}
                                                            >
                                                                <AppText style={{flex: 1}}>{item.name}</AppText>
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
                                        <View key={month.month} style={{gap: 5}}>
                                            <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                                                <AppText muted>
                                                    {new Date(`${month.month}-01T00:00:00Z`).toLocaleDateString(
                                                        undefined,
                                                        {month: "short", timeZone: "UTC"},
                                                    )}
                                                </AppText>
                                                <AppText muted>{formatCount(month.total)} hours</AppText>
                                            </View>
                                            <ProgressBar value={(month.total / monthlyMax) * 100} />
                                        </View>
                                    ))}
                                </View>
                            </Section>
                        </Content>
                    );
                }}
            </QueryPanel>
        </Page>
    );
}
