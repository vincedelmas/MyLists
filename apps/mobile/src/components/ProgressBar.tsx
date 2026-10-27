import {colors} from "../theme";
import {StyleSheet, View} from "react-native";


export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
    return (
        <View
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
            style={styles.track}
        >
            <View
                style={[styles.fill, { width: `${value}%`, backgroundColor: color }]}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    track: {
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.secondary,
        overflow: "hidden"
    },
    fill: {
        height: "100%",
        borderRadius: 2
    },
});
