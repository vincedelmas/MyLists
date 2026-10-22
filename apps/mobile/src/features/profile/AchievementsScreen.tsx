import {colors} from "../../theme";
import {useIsFocused} from "expo-router";
import {FlatList, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {AchievementRow} from "./AchievementRow";
import {ProgressBar} from "../../components/ProgressBar";
import {AppText, Page, QueryPanel, StateView} from "../../components/ui";
import {achievementsOptions} from "../../lib/react-query/query-options/profile.options";


export function AchievementsScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...achievementsOptions, enabled: focused });

    return (
        <Page title="Achievements" back>
            <QueryPanel query={query}>
                {(items) => (
                    <FlatList
                        data={items}
                        windowSize={7}
                        initialNumToRender={6}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={{ padding: 16, gap: 16 }}
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
                                    <View style={{ padding: 16, gap: 14 }}>
                                        {item.tiers.map((tier) => (
                                            <View key={tier.id} style={{ gap: 6 }}>
                                                <View style={{ gap: 12, flexDirection: "row", justifyContent: "space-between" }}>
                                                    <AppText
                                                        style={{
                                                            fontSize: 12,
                                                            textTransform: "capitalize",
                                                            color: tier.completed ? colors.rating : colors.muted,
                                                        }}
                                                    >
                                                        {tier.difficulty}
                                                    </AppText>
                                                    <AppText muted style={{ fontSize: 11 }}>
                                                        {tier.completedAt
                                                            ? new Date(tier.completedAt).toLocaleDateString()
                                                            : `${Math.round(tier.progress)}%`
                                                        }
                                                    </AppText>
                                                </View>
                                                <ProgressBar
                                                    value={tier.completed ? 100 : tier.progress}
                                                    color={tier.completed ? colors.rating : colors.accent}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}
            </QueryPanel>
        </Page>
    );
}
