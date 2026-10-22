import { View, StyleSheet } from "react-native";
import { CalendarDays, Clock, Heart, Star } from "lucide-react-native";
import { AppText, Cover } from "../../components/ui";
import type { MobileMedia } from "../../lib/api-client";
import { colors } from "../../theme";
import { formatMinutes } from "@/lib/utils/formatting/number";

export function MediaHero({ data }: { data: MobileMedia }) {
    const media = data.media;
    return (
        <View pointerEvents="none">
            <View style={{ minHeight: 224, justifyContent: "flex-end" }}>
                {media.backdrop && (
                    <Cover
                        uri={media.backdrop}
                        style={{ ...StyleSheet.absoluteFill, width: "100%", height: "100%", borderRadius: 0 }}
                    />
                )}
                <View style={{ ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.65)" }} />
                <View style={{ flexDirection: "row", gap: 16, padding: 16, alignItems: "flex-end" }}>
                    <Cover
                        uri={media.cover}
                        label={media.name}
                        style={{
                            width: 108,
                            height: undefined,
                            aspectRatio: 0.67,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    />
                    <View style={{ flex: 1, gap: 8 }}>
                        <AppText heading style={{ fontSize: 23, lineHeight: 28 }}>
                            {media.name}
                        </AppText>
                        {media.byline && <AppText style={{ fontSize: 13 }}>{media.byline}</AppText>}
                        {media.tagline && (
                            <AppText muted style={{ fontSize: 12, fontStyle: "italic" }}>
                                {media.tagline}
                            </AppText>
                        )}
                        {data.tracking?.favorite && <Heart size={18} fill={colors.favorite} color={colors.favorite} />}
                    </View>
                </View>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    padding: 16,
                    gap: 16,
                    backgroundColor: colors.surface,
                }}
            >
                {media.score != null && (
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <Star size={16} color={colors.rating} />
                        <AppText style={{ fontWeight: "700" }}>{(media.score / media.scoreDivisor).toFixed(1)}</AppText>
                        <AppText muted style={{ fontSize: 11 }}>
                            {media.provider.name}
                            {media.votes != null ? ` · ${media.votes.toLocaleString()} votes` : ""}
                        </AppText>
                    </View>
                )}
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <CalendarDays size={15} color={colors.muted} />
                    <AppText style={{ fontSize: 12 }}>{media.releaseDate?.slice(0, 4) ?? "TBA"}</AppText>
                </View>
                {media.duration || media.completionHours ? (
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <Clock size={15} color={colors.muted} />
                        <AppText style={{ fontSize: 12 }}>
                            {formatMinutes(media.completionHours ? media.completionHours * 60 : media.duration)}
                            {media.completionHours ? " · main story" : ""}
                        </AppText>
                    </View>
                ) : null}
            </View>
        </View>
    );
}
