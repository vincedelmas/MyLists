import {Pressable, StyleSheet, View} from "react-native";
import {Play} from "lucide-react-native";
import {formatNumber} from "@/lib/utils/formatting/number";
import {AppText} from "./ui";
import {ProgressBar} from "./ProgressBar";
import {colors} from "../theme";
import {useTabPush} from "../hooks/use-tab-push";
import type {MobileProfile} from "../lib/api-client";
import {mediaIcons, mediaColors, mediaLabels, compareMediaTypes} from "../lib/media";


interface MediaListGridProps {
    userId?: number;
    columns?: 2 | 3;
    includeContinue?: boolean;
    lists: (Pick<MobileProfile["lists"][number], "mediaType" | "level"> & { totalEntries?: number })[];
}


export function MediaListGrid({ lists, userId, includeContinue = false, columns = 2 }: MediaListGridProps) {
    const push = useTabPush();
    const tiles = [
        ...[...lists].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType)).map(list => ({
            level: list.level,
            total: list.totalEntries,
            key: list.mediaType,
            icon: mediaIcons[list.mediaType],
            label: mediaLabels[list.mediaType],
            color: mediaColors[list.mediaType],
            open: () => push({
                pathname: "/lists/[mediaType]",
                params: { mediaType: list.mediaType, userId }
            }),
        })),
        ...(includeContinue
            ? [
                {
                    icon: Play,
                    level: null,
                    total: undefined,
                    key: "continue",
                    label: "Continue",
                    color: colors.accent,
                    open: () => push({
                        pathname: "/library/[kind]",
                        params: { kind: "continue", userId }
                    })
                }
            ]
            : []),
    ];

    return (
        <View style={styles.grid}>
            {tiles.map(({ key, label, icon: Icon, color, level, total, open }) =>
                <Pressable
                    key={key}
                    onPress={open}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}${level === null ? "" : `, level ${Math.floor(level)}`}${total === undefined ? "" : `, ${total} entries`}`}
                    style={({ pressed }) => [styles.tile, columns === 3 && styles.threeColumns, pressed && styles.pressed]}
                >
                    <View style={styles.identity}>
                        <Icon size={17} color={color}/>
                        <AppText style={styles.label}>
                            {label}
                        </AppText>
                    </View>
                    {level === null
                        ? <AppText muted style={styles.caption}>
                            Pick up where you left off
                        </AppText>
                        : <>
                            <AppText
                                style={[
                                    styles.level,
                                    { color }
                                ]}
                            >Lvl. {Math.floor(level)}</AppText>
                            <ProgressBar
                                value={(level % 1) * 100}
                                color={color}
                            />
                            {total !== undefined &&
                                <AppText muted style={styles.caption}>{formatNumber(total, { locale: "en", notation: "compact", maximumFractionDigits: 1 })} entries</AppText>
                            }
                        </>
                    }
                </Pressable>)
            }
        </View>
    );
}


const styles = StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tile: {
        flexGrow: 1,
        flexBasis: "46%",
        padding: 12,
        gap: 9,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface
    },
    threeColumns: { flexBasis: "30%" },
    identity: { flexDirection: "row", alignItems: "center", gap: 6 },
    label: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "600",
        flex: 1
    },
    level: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "600",
        fontVariant: ["tabular-nums"]
    },
    caption: { fontSize: 11, lineHeight: 16 },
    pressed: { opacity: 0.6 },
});
