import {colors} from "../theme";
import {View} from "react-native";


export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
    return (
        <View
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
            style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.secondary,
                overflow: "hidden"
            }}
        >
            <View
                style={{
                    height: "100%",
                    borderRadius: 2,
                    width: `${value}%`,
                    backgroundColor: color,
                }}
            />
        </View>
    );
}
