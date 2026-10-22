import {View} from "react-native";
import {colors} from "../../theme";
import {Award} from "lucide-react-native";
import {AppText} from "../../components/ui";


interface AchievementRowProps {
    name: string;
    detail: string;
    completed?: boolean;
    description: string;
}


export function AchievementRow({ name, description, detail, completed = true }: AchievementRowProps) {
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
                    color={completed ? colors.rating : colors.muted}
                />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
                <AppText style={{ fontWeight: "600" }}>
                    {name}
                </AppText>
                <AppText muted style={{ fontSize: 12 }}>
                    {description}
                </AppText>
                <AppText style={{ color: completed ? colors.rating : colors.muted, fontSize: 11 }}>
                    {detail}
                </AppText>
            </View>
        </View>
    );
}
