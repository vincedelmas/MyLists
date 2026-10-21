import {useTabPush} from "../lib/use-tab-push";
import {memo} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import {Heart, Star} from "lucide-react-native";
import {AppText, Cover} from "./ui";
import {ratingLabel} from "../lib/ratings";
import {colors, statusColors} from "../theme";
import type {MediaType} from "../lib/api-client";

export const MediaRow = memo(function MediaRow({
    mediaType,
    mediaId,
    name,
    cover,
    status,
    rating,
    favorite,
    detail,
    onPress,
    ratingSystem = "score",
}: {
    mediaType: MediaType;
    mediaId?: number;
    name: string;
    cover: string | null;
    status?: string;
    rating?: number | null;
    favorite?: boolean | null;
    ratingSystem?: "score" | "feeling";
    detail?: string;
    onPress?: () => void;
}) {
    const push = useTabPush();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name}${status ? `, ${status}` : ""}`}
            onPress={
                onPress ??
                (() =>
                    push({
                        pathname: "/media/[mediaType]/[mediaId]",
                        params: {mediaType, mediaId: String(mediaId)},
                    }))
            }
            style={({pressed}) => [styles.row, pressed && {opacity: 0.65}]}
        >
            <Cover uri={cover} />
            <View style={{flex: 1, gap: 6}}>
                <AppText numberOfLines={2} style={{fontWeight: "600"}}>
                    {name}
                </AppText>
                {status && (
                    <AppText style={{color: statusColors[status] ?? colors.muted, fontSize: 12}}>{status}</AppText>
                )}
                {detail && (
                    <AppText muted numberOfLines={2} style={{fontSize: 12}}>
                        {detail}
                    </AppText>
                )}
            </View>
            <View style={{alignItems: "flex-end", gap: 10}}>
                {favorite && <Heart size={16} fill={colors.favorite} color={colors.favorite} />}
                {rating != null && (
                    <View style={{flexDirection: "row", gap: 4, alignItems: "center"}}>
                        <Star size={13} color={colors.rating} />
                        <AppText style={{fontSize: 12}}>{ratingLabel(rating, ratingSystem)}</AppText>
                    </View>
                )}
            </View>
        </Pressable>
    );
});
const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
});
