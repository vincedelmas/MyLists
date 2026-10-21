import {View} from "react-native";
import {colors} from "../theme";

export function ProgressBar({value, color = colors.accent}: {value: number; color?: string}) {
    return (
        <View
            accessible
            accessibilityRole="progressbar"
            accessibilityValue={{min: 0, max: 100, now: Math.round(value)}}
            style={{height: 4, borderRadius: 2, backgroundColor: colors.secondary, overflow: "hidden"}}
        >
            <View style={{height: "100%", width: `${value}%`, backgroundColor: color, borderRadius: 2}} />
        </View>
    );
}
