import { AppText } from "./ui";
import { colors } from "../theme";
import { View } from "react-native";
import { Star } from "lucide-react-native";
import { FeelingIcon } from "./feeling-icon";
import { ratingLabel } from "../lib/ratings";

interface RatingProps {
    size?: number;
    value: number | null;
    system: "score" | "feeling";
}

export function Rating({ value, system, size = 16 }: RatingProps) {
    if (value === null) return null;

    return (
        <View
            accessible={true}
            accessibilityLabel={`Rating: ${ratingLabel(value, system)}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
        >
            <Star size={size} color={colors.rating} />
            {system === "feeling" ? (
                <FeelingIcon value={value} size={size + 3} />
            ) : (
                <AppText style={{ fontSize: size - 2 }}>{value.toFixed(1)}</AppText>
            )}
        </View>
    );
}
