import {StyleSheet, View} from "react-native";
import {CircleAlert, CircleCheck} from "lucide-react-native";
import {AppText} from "../../components/ui";
import {colors} from "../../theme";


export function SettingsFeedback({ error, success }: { error?: string | null; success?: string | false }) {
    if (!error && !success) return null;
    const color = error ? colors.error : colors.accent;
    const Icon = error ? CircleAlert : CircleCheck;

    return (
        <View
            style={[
                styles.feedback,
                { backgroundColor: `${color}10`, borderColor: `${color}40` }
            ]}
        >
            <Icon size={18} color={color}/>
            <AppText
                accessibilityRole="alert"
                style={[
                    styles.text,
                    { color }
                ]}
            >
                {error || success}
            </AppText>
        </View>
    );
}


const styles = StyleSheet.create({
    feedback: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1
    },
    text: { flex: 1, fontSize: 12, lineHeight: 19 },
});
