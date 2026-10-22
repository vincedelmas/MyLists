import { useState } from "react";
import { Collapsible, RNHostView } from "@expo/ui";
import { NativeHost } from "../../components/native-host";
import { colors } from "../../theme";
import { useIsFocused } from "expo-router";
import { Animated, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AchievementRow } from "./AchievementRow";
import { ProgressBar } from "../../components/ProgressBar";
import { ProfileQueryPanel } from "./ProfileQueryPanel";
import { useProfileScroll } from "../../hooks/use-profile-scroll";
import { AppText, QueryPanel, StateView, Section } from "../../components/ui";
import { achievementsOptions, recentAchievementsOptions } from "../../lib/react-query/query-options/profile.options";

export function AchievementsContent({ userId }: { userId?: number }) {
    const focused = useIsFocused();
    const { scrollProps, contentContainerStyle } = useProfileScroll();
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const query = useQuery({ ...achievementsOptions(userId), enabled: focused });
    const recent = useQuery({ ...recentAchievementsOptions(userId), enabled: focused });

    return (
        <>
            <ProfileQueryPanel query={query}>
                {(items) => (
                    <Animated.FlatList
                        {...scrollProps}
                        data={items}
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
                                                        detail={`${item.difficulty} · ${new Date(item.completedAt!).toLocaleDateString()}`}
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
                            const unlocked = item.tiers.filter((tier) => tier.completed).length;
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
                                        completed={unlocked > 0}
                                        description={item.description}
                                        detail={`${unlocked} of ${item.tiers.length} tiers unlocked`}
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
                                                                        color: tier.completed
                                                                            ? colors.rating
                                                                            : colors.muted,
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
                                                                color={tier.completed ? colors.rating : colors.accent}
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
