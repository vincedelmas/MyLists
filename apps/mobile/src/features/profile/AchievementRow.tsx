import {View} from "react-native";
import {achievementColors, colors} from "../../theme";
import type {AchievementDifficulty} from "@/lib/utils/enums";
import {Award} from "lucide-react-native";
import {AppText} from "../../components/ui";


interface AchievementRowProps {
    name: string;
    detail: string;
    difficulty?: AchievementDifficulty;
    description: string;
}


export function AchievementRow({ name, description, detail, difficulty }: AchievementRowProps) {
    const color = difficulty ? achievementColors[difficulty] : colors.muted;
    return (
        <View style={{ padding: 16, flexDirection: "row", gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.secondary,
                }}
            >
                <Award
                    size={23}
                    color={color}
                />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
                <AppText style={{ fontWeight: "600" }}>
                    {name}
                </AppText>
                <AppText muted style={{ fontSize: 12 }}>
                    {description}
                </AppText>
                <AppText style={{ color, fontSize: 11 }}>
                    {detail}
                </AppText>
            </View>
        </View>
    );
}
