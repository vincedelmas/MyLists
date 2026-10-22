import { View, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";
import { AppText, Cover } from "../../components/ui";
import type { MobileMedia } from "../../lib/api-client";
import { colors, spacing } from "../../theme";
import { formatMinutes } from "@/lib/utils/formatting/number";

export function MediaHero({ data }: { data: MobileMedia }) {
    const media = data.media;
    const time = media.completionHours
        ? `${formatMinutes(media.completionHours * 60, { compact: true })} · main story`
        : media.duration
          ? formatMinutes(media.duration, { compact: true })
          : null;
    return (
        <View pointerEvents="box-none" style={styles.hero}>
            {media.backdrop && (
                <View pointerEvents="none" style={styles.backdrop}>
                    <Cover uri={media.backdrop} style={styles.backdropImage} />
                    <View style={styles.fade} />
                </View>
            )}
            <View pointerEvents="box-none" style={[styles.identity, media.backdrop && styles.overlap]}>
                <Cover pointerEvents="none" uri={media.cover} label={media.name} style={styles.poster} />
                <View pointerEvents="none" style={[styles.info, media.backdrop && styles.overlapInfo]}>
                    <AppText heading style={styles.title}>
                        {media.name}
                    </AppText>
                    <AppText muted style={styles.metadata}>
                        {[media.releaseDate?.slice(0, 4) ?? "TBA", time].filter(Boolean).join(" · ")}
                    </AppText>
                    {media.byline && (
                        <AppText muted style={styles.metadata}>
                            {media.byline}
                        </AppText>
                    )}
                    {media.score != null && (
                        <View style={styles.scoreRow}>
                            <Star size={15} color={colors.rating} fill={colors.rating} />
                            <AppText style={styles.score}>{(media.score / media.scoreDivisor).toFixed(1)}</AppText>
                            <AppText muted style={styles.provider}>
                                {media.provider.name}
                                {media.votes != null ? ` · ${media.votes.toLocaleString()} votes` : ""}
                            </AppText>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    hero: { paddingBottom: spacing.xl },
    backdrop: { height: 156 },
    backdropImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%", borderRadius: 0 },
    fade: {
        ...StyleSheet.absoluteFill,
        backgroundImage: `linear-gradient(to bottom, rgba(11,11,11,0.05), ${colors.background})`,
    },
    identity: {
        flexDirection: "row",
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        alignItems: "flex-start",
    },
    overlap: { marginTop: -40, paddingTop: 0 },
    poster: { width: 100, height: undefined, aspectRatio: 0.67, borderRadius: 10 },
    info: { flex: 1, gap: spacing.sm },
    overlapInfo: { paddingTop: 36 },
    title: { fontSize: 22, lineHeight: 27 },
    metadata: { fontSize: 12, lineHeight: 18 },
    scoreRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, paddingTop: spacing.xs },
    score: { fontSize: 15, fontWeight: "700" },
    provider: { fontSize: 10, lineHeight: 16 },
});
