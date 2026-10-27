import {Pressable, View, StyleSheet} from "react-native";
import {BookmarkCheck, ChevronRight, Heart, Star} from "lucide-react-native";
import {AppText, Cover} from "../../components/ui";
import type {MobileMedia} from "../../lib/api-client";
import {Rating} from "../../components/rating";
import {mediaColors, mediaLabels} from "../../lib/media";
import {colors, spacing} from "../../theme";
import {formatMinutes} from "@/lib/utils/formatting/number";


export function MediaHero({ data, mediaType, pending, onTrack, onBookCover }: {
    data: MobileMedia;
    mediaType: keyof typeof mediaLabels;
    pending: boolean;
    onTrack: () => void;
    onBookCover: () => void
}) {
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
                    <Cover uri={media.backdrop} style={styles.backdropImage}/>
                    <View style={styles.fade}/>
                </View>
            )}

            <View pointerEvents="box-none" style={[styles.identity, media.backdrop && styles.overlap]}>
                <View style={{ gap: 4 }}>
                    <Cover pointerEvents="none" uri={media.cover} label={media.name} style={styles.poster}/>{media.needsCover &&
                    <Pressable accessibilityRole="button" onPress={onBookCover} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}><AppText
                        style={{ fontSize: 12, color: colors.accent }}>Add cover</AppText></Pressable>}</View>
                <View pointerEvents="none" style={[styles.info, media.backdrop && styles.overlapInfo]}>
                    <AppText style={{ color: mediaColors[mediaType], fontSize: 11 }}>{mediaLabels[mediaType]}</AppText>
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
                            <Star size={15} color={colors.rating} fill={colors.rating}/>
                            <AppText style={styles.score}>{(media.score / media.scoreDivisor).toFixed(1)}</AppText>
                            <AppText muted style={styles.provider}>
                                {media.provider.name}
                                {media.votes != null ? ` · ${media.votes.toLocaleString()} votes` : ""}
                            </AppText>
                        </View>
                    )}
                </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={data.tracking ? "Manage this title in your list" : "Track this title"} disabled={pending} onPress={onTrack}
                       style={({ pressed }) => [styles.track, pressed && { opacity: 0.6 }]}>
                <BookmarkCheck size={21} color={colors.accent}/><View style={{ flex: 1, gap: 4 }}><AppText
                style={{ fontSize: 14, fontWeight: "600" }}>{data.tracking ? data.tracking.status : data.active ? "Add to your list" : "Media list disabled"}</AppText><AppText
                muted
                style={{ fontSize: 11 }}>{data.tracking ? "Progress, rating & more" : data.active ? "Track, rate and remember" : "Enable this list in settings"}</AppText></View>
                {data.tracking?.favorite && <Heart size={17} color={colors.favorite} fill={colors.favorite}/>}{data.tracking?.rating != null &&
                <Rating value={data.tracking.rating} system={data.ratingSystem}/>}<ChevronRight size={18} color={colors.accent}/>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: { paddingBottom: spacing.lg, gap: 16 },
    track: {
        marginHorizontal: 16,
        minHeight: 64,
        padding: 14,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border
    },
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
