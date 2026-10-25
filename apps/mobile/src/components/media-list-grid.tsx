import {AppText} from "./ui";
import {colors} from "../theme";
import {Play} from "lucide-react-native";
import {Pressable, View} from "react-native";
import {useTabPush} from "../hooks/use-tab-push";
import type {MobileProfile} from "../lib/api-client";
import {mediaIcons, mediaColors, mediaLabels, compareMediaTypes} from "../lib/media";

interface MediaListGridProps {
    userId?: number;
    includeContinue?: boolean;
    lists: Pick<MobileProfile["lists"][number], "mediaType" | "level">[];
}

export function MediaListGrid({ lists, userId, includeContinue = false }: MediaListGridProps) {
    const push = useTabPush();

    const tiles = [
        ...[...lists].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType)).map((list) => ({
            level: list.level,
            key: list.mediaType,
            icon: mediaIcons[list.mediaType],
            label: mediaLabels[list.mediaType],
            color: mediaColors[list.mediaType],
            open: () => push({ pathname: "/lists/[mediaType]", params: { mediaType: list.mediaType, userId } }),
        })),
        ...(includeContinue
            ? [
                {
                    icon: Play,
                    level: null,
                    key: "continue",
                    label: "Continue",
                    color: colors.accent,
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
                    onPress={open}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                        gap: 6,
                        flexGrow: 1,
                        padding: 12,
                        borderWidth: 1,
                        flexBasis: "47%",
                        borderRadius: 10,
                        opacity: pressed ? 0.6 : 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                    })}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Icon size={18} color={color}/>
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
