import {useIsFocused} from "expo-router";
import {FlatList, View} from "react-native";
import {Award} from "lucide-react-native";
import {useQuery} from "@tanstack/react-query";
import {AppText, Page, QueryPanel, StateView} from "../../components/ui";
import {achievementsOptions} from "../../lib/react-query/query-options/profile.options";
import {colors} from "../../theme";

export function AchievementsScreen() {
    const focused = useIsFocused();
    const query = useQuery({...achievementsOptions, enabled: focused});
    return (
        <Page title="Achievements" back>
            <QueryPanel query={query}>
                {(items) => (
                    <FlatList
                        data={items}
                        keyExtractor={(item) => String(item.id)}
                        ListEmptyComponent={
                            <StateView
                                title="No achievements yet"
                                message="Keep tracking to unlock your first milestone."
                            />
                        }
                        renderItem={({item}) => (
                            <View
                                style={{
                                    padding: 16,
                                    flexDirection: "row",
                                    gap: 14,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                }}
                            >
                                <Award size={28} color={item.completedAt ? colors.rating : colors.muted} />
                                <View style={{flex: 1, gap: 5}}>
                                    <AppText style={{fontWeight: "600"}}>{item.name}</AppText>
                                    <AppText muted>{item.description}</AppText>
                                    <AppText
                                        style={{color: item.completedAt ? colors.rating : colors.muted, fontSize: 12}}
                                    >
                                        {item.difficulty} ·{" "}
                                        {item.completedAt
                                            ? `Unlocked ${new Date(item.completedAt).toLocaleDateString()}`
                                            : "Locked"}
                                    </AppText>
                                </View>
                            </View>
                        )}
                    />
                )}
            </QueryPanel>
        </Page>
    );
}
