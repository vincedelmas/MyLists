import {StyleSheet, View} from "react-native";
import {Heart, MessageCircle} from "lucide-react-native";
import {AppText} from "./ui";
import {colors, statusColors} from "../theme";
import {Rating} from "./rating";


export function MediaListDetails({ status, rating, ratingSystem, favorite, hasComment }: {
    status: string | null;
    rating: number | null;
    ratingSystem: "score" | "feeling";
    favorite: boolean | null;
    hasComment: boolean;
}) {
    return (
        <View style={styles.group}>
            {status &&
                <AppText style={[styles.caption, { color: statusColors[status] }]}>
                    {status}
                </AppText>
            }
            <View
                style={styles.row}
            >
                <Rating
                    value={rating}
                    system={ratingSystem}
                    size={13}
                    compact
                />
                {favorite &&
                    <Heart
                        size={14}
                        color={colors.favorite}
                        accessibilityLabel="Favorite"
                    />
                }
                {hasComment &&
                    <MessageCircle
                        size={14}
                        color={colors.info}
                        accessibilityLabel="Has comment"
                    />
                }
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    group: { gap: 5 },
    caption: { fontSize: 11 },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center"
    },
});
