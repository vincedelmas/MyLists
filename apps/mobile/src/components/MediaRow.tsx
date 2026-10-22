import {memo} from "react";
import {AppText, Cover} from "./ui";
import {ratingLabel} from "../lib/ratings";
import {colors, statusColors} from "../theme";
import {useTabPush} from "../hooks/use-tab-push";
import {Heart, Star} from "lucide-react-native";
import type {MediaType} from "../lib/api-client";
import {Pressable, StyleSheet, View} from "react-native";


interface MediaRowProps {
    name: string;
    status?: string;
    detail?: string;
    mediaId?: number;
    onPress?: () => void;
    mediaType: MediaType;
    cover: string | null;
    rating?: number | null;
    favorite?: boolean | null;
    ratingSystem?: "score" | "feeling";
}


export const MediaRow = memo(function MediaRow(props: MediaRowProps) {
    const push = useTabPush();
    const { mediaType, mediaId, name, cover, status, rating, favorite, detail, onPress, ratingSystem = "score" } = props;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${name}${status ? `, ${status}` : ""}`}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}
            onPress={onPress ?? (() =>
                push({
                    pathname: "/media/[mediaType]/[mediaId]",
                    params: { mediaType, mediaId: String(mediaId) },
                }))
            }
        >
            <Cover uri={cover}/>
            <View style={{ flex: 1, gap: 6 }}>
                <AppText numberOfLines={2} style={{ fontWeight: "600" }}>
                    {name}
                </AppText>
                {status &&
                    <AppText style={{ color: statusColors[status] ?? colors.muted, fontSize: 12 }}>
                        {status}
                    </AppText>
                }
                {detail &&
                    <AppText muted numberOfLines={2} style={{ fontSize: 12 }}>
                        {detail}
                    </AppText>
                }
            </View>
            <View style={{ alignItems: "flex-end", gap: 10 }}>
                {favorite &&
                    <Heart
                        size={16}
                        fill={colors.favorite}
                        color={colors.favorite}
                    />
                }
                {rating != null &&
                    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                        <Star size={13} color={colors.rating}/>
                        <AppText style={{ fontSize: 12 }}>
                            {ratingLabel(rating, ratingSystem)}
                        </AppText>
                    </View>
                }
            </View>
        </Pressable>
    );
});


const styles = StyleSheet.create({
    row: {
        gap: 14,
        padding: 16,
        alignItems: "center",
        flexDirection: "row",
        borderBottomColor: colors.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
});
