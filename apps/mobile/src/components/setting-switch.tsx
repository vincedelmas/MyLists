import {View} from "react-native";
import {Switch} from "@expo/ui";
import {NativeHost} from "./native-host";
import {AppText} from "./ui";

export function SettingSwitch({ label, description, value, disabled, onChange }: {
    label: string;
    description?: string;
    value: boolean;
    disabled?: boolean;
    onChange: (value: boolean) => void
}) {
    return <View style={{ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 52 }}><View style={{ flex: 1, gap: 5 }}><AppText
        style={{ fontSize: 14, lineHeight: 21 }}>{label}</AppText>{description && <AppText muted style={{ fontSize: 12, lineHeight: 18 }}>{description}</AppText>}</View><NativeHost
        matchContents accessible accessibilityLabel={label} accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} onAccessibilityTap={() => {
        if (!disabled) onChange(!value);
    }}><Switch value={value} disabled={disabled} onValueChange={onChange}/></NativeHost></View>;
}
