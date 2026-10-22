import { View, StyleSheet } from "react-native";
import { Heart, Star } from "lucide-react-native";
import { AppText, Cover } from "../../components/ui";
import type { MobileMedia } from "../../lib/api-client";
import { colors } from "../../theme";
import { formatMinutes } from "@/lib/utils/formatting/number";

export function MediaHero({ data }: { data: MobileMedia }) {
    const media = data.media;
    const time = media.completionHours
        ? `${formatMinutes(media.completionHours * 60)} · main story`
        : media.duration
          ? formatMinutes(media.duration)
          : null;
    return (
        <View pointerEvents="box-none">
            {media.backdrop && (
                <View pointerEvents="none" style={{ height: 176 }}>
                    <Cover
                        uri={media.backdrop}
                        style={{ ...StyleSheet.absoluteFill, width: "100%", height: "100%", borderRadius: 0 }}
                    />
                    <View
                        style={{
                            ...StyleSheet.absoluteFill,
                            backgroundImage: `linear-gradient(to bottom, rgba(11,11,11,0.05) 15%, ${colors.background} 100%)`,
                        }}
                    />
                </View>
            )}
            <View
                pointerEvents="box-none"
                style={{
                    flexDirection: "row",
                    gap: 18,
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                    paddingTop: media.backdrop ? 0 : 20,
                    marginTop: media.backdrop ? -28 : 0,
                }}
            >
                <View pointerEvents="box-none" style={{ flex: 1, gap: 9, paddingTop: 10 }}>
                    <View pointerEvents="none" style={{ gap: 9 }}>
                        <AppText heading style={{ fontSize: 24, lineHeight: 29 }}>
                            {media.name}
                        </AppText>
                        <AppText muted style={{ fontSize: 12 }}>
                            {[media.releaseDate?.slice(0, 4) ?? "TBA", time].filter(Boolean).join(" · ")}
                        </AppText>
                        {media.byline && <AppText style={{ fontSize: 13, lineHeight: 19 }}>{media.byline}</AppText>}
                    </View>
                </View>
                <Cover
                    pointerEvents="none"
                    uri={media.cover}
                    label={media.name}
                    style={{
                        width: 92,
                        height: undefined,
                        aspectRatio: 0.67,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                />
            </View>
            <View
                pointerEvents="none"
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: colors.border,
                }}
            >
                {media.score != null && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Star size={18} color={colors.rating} fill={colors.rating} />
                        <AppText style={{ fontSize: 21, fontWeight: "700" }}>
                            {(media.score / media.scoreDivisor).toFixed(1)}
                        </AppText>
                        <View>
                            <AppText style={{ fontSize: 11 }}>{media.provider.name}</AppText>
                            {media.votes != null && (
                                <AppText muted style={{ fontSize: 10, lineHeight: 15 }}>
                                    {media.votes.toLocaleString()} votes
                                </AppText>
                            )}
                        </View>
                    </View>
                )}
                <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                    <AppText muted style={{ fontSize: 11 }}>
                        {data.tracking?.status ?? "Not in your list"}
                    </AppText>
                    {data.tracking?.favorite && <Heart size={14} fill={colors.favorite} color={colors.favorite} />}
                </View>
            </View>
        </View>
    );
}
