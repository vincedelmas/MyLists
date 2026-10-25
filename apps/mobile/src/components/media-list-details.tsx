import { View } from "react-native";
import { Heart, MessageCircle, Star } from "lucide-react-native";
import { AppText } from "./ui";
import { colors, statusColors } from "../theme";
import { ratingLabel } from "../lib/ratings";

export function MediaListDetails({ status, rating, ratingSystem, favorite, hasComment }: {
    status: string | null;
    rating: number | null;
    ratingSystem: "score" | "feeling";
    favorite: boolean | null;
    hasComment: boolean;
}) {
    return (
        <View style={{ gap: 5 }}>
            {status && <AppText style={{ fontSize: 11, color: statusColors[status] }}>{status}</AppText>}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                {rating !== null && (
                    <View accessibilityLabel={`Rating: ${ratingLabel(rating, ratingSystem)}`} style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                        {ratingSystem === "score" && <Star size={13} color={colors.rating} />}
                        <AppText style={{ fontSize: 12 }}>{ratingLabel(rating, ratingSystem)}</AppText>
                    </View>
                )}
                {favorite && <Heart size={14} color={colors.favorite} accessibilityLabel="Favorite" />}
                {hasComment && <MessageCircle size={14} color={colors.info} accessibilityLabel="Has comment" />}
            </View>
        </View>
    );
}
