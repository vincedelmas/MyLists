import { Pressable, View } from "react-native";
import { Play } from "lucide-react-native";
import { AppText } from "./ui";
import { colors } from "../theme";
import { mediaIcons, mediaColors, mediaLabels } from "../lib/media";
import { useTabPush } from "../hooks/use-tab-push";
import type { MobileProfile } from "../lib/api-client";

export function MediaListGrid({
    lists,
    userId,
    includeContinue = false,
}: {
    lists: Pick<MobileProfile["lists"][number], "mediaType" | "level">[];
    userId?: number;
    includeContinue?: boolean;
}) {
    const push = useTabPush();
    const tiles = [
        ...lists.map((list) => ({
            key: list.mediaType,
            label: mediaLabels[list.mediaType],
            icon: mediaIcons[list.mediaType],
            color: mediaColors[list.mediaType],
            level: list.level,
            open: () => push({ pathname: "/lists/[mediaType]", params: { mediaType: list.mediaType, userId } }),
        })),
        ...(includeContinue
            ? [
                  {
                      key: "continue",
                      label: "Continue",
                      icon: Play,
                      color: colors.accent,
                      level: null,
                      open: () => push({ pathname: "/library/[kind]", params: { kind: "continue", userId } }),
                  },
              ]
            : []),
    ];
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {tiles.map(({ key, label, icon: Icon, color, level, open }) => (
                <Pressable
                    key={key}
                    accessibilityRole="button"
                    onPress={open}
                    style={({ pressed }) => ({
                        flexBasis: "47%",
                        flexGrow: 1,
                        gap: 6,
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.6 : 1,
                    })}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Icon size={18} color={color} />
                        <AppText style={{ fontWeight: "600", flex: 1, fontSize: 13 }}>{label}</AppText>
                    </View>
                    {level === null ? (
                        <AppText muted style={{ fontSize: 12 }}>
                            Pick up where you left off
                        </AppText>
                    ) : (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <AppText muted style={{ fontSize: 12 }}>
                                Level {Math.floor(level)}
                            </AppText>
                            <AppText style={{ fontSize: 12, color }}>{Math.floor((level % 1) * 100)}%</AppText>
                        </View>
                    )}
                </Pressable>
            ))}
        </View>
    );
}
