import {AppText} from "./ui";
import {colors} from "../theme";
import {StyleSheet, View} from "react-native";
import {Star} from "lucide-react-native";
import {FeelingIcon} from "./feeling-icon";
import {ratingLabel} from "../lib/ratings";


interface RatingProps {
    size?: number;
    value: number | null;
    system: "score" | "feeling";
    compact?: boolean;
}


export function Rating({ value, system, size = 16, compact = false }: RatingProps) {
    if (value === null) return null;

    return (
        <View
            accessible={true}
            accessibilityLabel={`Rating: ${ratingLabel(value, system)}`}
            style={styles.row}
        >
            {(!compact || system === "score") &&
                <Star size={size} color={colors.rating}/>
            }
            {system === "feeling" && !compact
                ? (
                    <FeelingIcon
                        value={value}
                        size={size + 3}
                    />
                )
                : (
                    <AppText style={compact ? styles.compactValue : { fontSize: size - 2 }}>
                        {compact ? ratingLabel(value, system) : value.toFixed(1)}
                    </AppText>
                )
            }
        </View>
    );
}


const styles = StyleSheet.create({
    compactValue: { fontSize: 12 },
    row: { flexDirection: "row", alignItems: "center", gap: 5 },
});
