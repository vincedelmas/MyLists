import { mediaLabels } from "../../lib/media";
import { useState } from "react";
import { Collapsible, RNHostView } from "@expo/ui";
import { NativeHost } from "../../components/native-host";
import { achievementColors, colors } from "../../theme";
import { useIsFocused } from "expo-router";
import { Animated, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AchievementRow } from "./AchievementRow";
import { ProgressBar } from "../../components/ProgressBar";
import { ProfileQueryPanel } from "./ProfileQueryPanel";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { AppText, QueryPanel, StateView, Section, Select } from "../../components/ui";
import { achievementsOptions, recentAchievementsOptions } from "../../lib/react-query/query-options/profile.options";

export function AchievementsContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const [mediaType, setMediaType] = useState("all");
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const query = useQuery({ ...achievementsOptions(userId), enabled: focused });
    const recent = useQuery({ ...recentAchievementsOptions(userId), enabled: focused });

    return (
        <>
            <ProfileQueryPanel query={query}>
                {(items) => (
                    <Animated.FlatList
                        {...scrollProps}
                        data={items.filter((item) => mediaType === "all" || item.mediaType === mediaType)}
                        ListHeaderComponent={
                            <View style={{ gap: 20 }}>
                                <Section title="Latest achievements">
                                    <QueryPanel query={recent}>
                                        {(earned) =>
                                            earned.length ? (
                                                earned.map((item) => (
                                                    <AchievementRow
                                                        key={`${item.id}:${item.difficulty}`}
                                                        name={item.name}
                                                        description={item.description}
                                                        difficulty={item.difficulty}
                                                        detail={`${mediaLabels[item.mediaType]} · ${item.difficulty} · ${new Date(item.completedAt!).toLocaleDateString()}`}
                                                    />
                                                ))
                                            ) : (
                                                <AppText muted style={{ padding: 16 }}>
                                                    The next milestone is ahead.
                                                </AppText>
                                            )
                                        }
                                    </QueryPanel>
                                </Section>
                                <AppText heading>All achievements</AppText>
                                <Select
                                    label="Media type"
                                    value={mediaType}
                                    onChange={setMediaType}
                                    options={[
                                        { value: "all", label: "All media" },
                                        ...[...new Set(items.map((item) => item.mediaType))].map((value) => ({
                                            value,
                                            label: mediaLabels[value],
                                        })),
                                    ]}
                                />
                            </View>
                        }
                        windowSize={7}
                        initialNumToRender={6}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={[{ padding: 16, gap: 16 }, contentContainerStyle]}
                        ListEmptyComponent={
                            <StateView
                                title="No achievements"
                                message="Activate media lists to discover their milestones."
                            />
                        }
                        renderItem={({ item }) => {
                            const completedTiers = item.tiers.filter((tier) => tier.completed);
                            const unlocked = completedTiers.length;
                            const highestTier = completedTiers.at(-1);
                            return (
                                <View
                                    style={{
                                        borderWidth: 1,
                                        borderRadius: 14,
                                        overflow: "hidden",
                                        borderColor: colors.border,
                                        backgroundColor: colors.surface,
                                    }}
                                >
                                    <AchievementRow
                                        name={item.name}
                                        difficulty={highestTier?.difficulty}
                                        description={item.description}
                                        detail={`${mediaLabels[item.mediaType]} · ${highestTier ? `${highestTier.difficulty} · ` : ""}${unlocked} of ${item.tiers.length} tiers unlocked`}
                                    />
                                    <NativeHost style={{ width: "100%" }}>
                                        <Collapsible
                                            label="View tiers"
                                            isOpen={expandedId === item.id}
                                            onOpenChange={(open) => setExpandedId(open ? item.id : null)}
                                        >
                                            <RNHostView matchContents={{ vertical: true }}>
                                                <View style={{ gap: 14 }}>
                                                    {item.tiers.map((tier) => (
                                                        <View key={tier.id} style={{ gap: 6 }}>
                                                            <View
                                                                style={{
                                                                    gap: 12,
                                                                    flexDirection: "row",
                                                                    justifyContent: "space-between",
                                                                }}
                                                            >
                                                                <AppText
                                                                    style={{
                                                                        fontSize: 12,
                                                                        textTransform: "capitalize",
                                                                        color: achievementColors[tier.difficulty],
                                                                    }}
                                                                >
                                                                    {tier.difficulty}
                                                                </AppText>
                                                                <AppText muted style={{ fontSize: 11 }}>
                                                                    {tier.completedAt
                                                                        ? new Date(
                                                                              tier.completedAt,
                                                                          ).toLocaleDateString()
                                                                        : `${Math.round(tier.progress)}%`}
                                                                </AppText>
                                                            </View>
                                                            <ProgressBar
                                                                value={tier.completed ? 100 : tier.progress}
                                                                color={achievementColors[tier.difficulty]}
                                                            />
                                                        </View>
                                                    ))}
                                                </View>
                                            </RNHostView>
                                        </Collapsible>
                                    </NativeHost>
                                </View>
                            );
                        }}
                    />
                )}
            </ProfileQueryPanel>
        </>
    );
}
