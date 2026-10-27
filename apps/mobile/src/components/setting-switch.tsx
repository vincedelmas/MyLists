import {StyleSheet, View} from "react-native";
import {Switch} from "@expo/ui";
import {NativeHost} from "./native-host";
import {AppText} from "./ui";


interface SettingSwitchProps {
    label: string;
    description?: string;
    value: boolean;
    disabled?: boolean;
    onChange: (value: boolean) => void;
}


export function SettingSwitch({ label, description, value, disabled, onChange }: SettingSwitchProps) {
    return (
        <View
            style={styles.row}
        >
            <View style={styles.group}>
                <AppText
                    style={styles.text}
                >
                    {label}
                </AppText>
                {description &&
                    <AppText
                        muted
                        style={styles.caption}
                    >
                        {description}
                    </AppText>
                }
            </View>
            <NativeHost
                matchContents
                accessible
                accessibilityLabel={label}
                accessibilityRole="switch"
                accessibilityState={{ checked: value, disabled }}
                onAccessibilityTap={() => {
                    if (!disabled) onChange(!value);
                }}
            >
                <Switch
                    value={value}
                    disabled={disabled}
                    onValueChange={onChange}
                />
            </NativeHost>
        </View>
    );
}


const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        minHeight: 52
    },
    group: { flex: 1, gap: 5 },
    text: { fontSize: 14, lineHeight: 21 },
    caption: { fontSize: 12, lineHeight: 18 },
});
