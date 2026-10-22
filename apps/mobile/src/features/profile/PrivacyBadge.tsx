import {BottomSheet, Button} from "@expo/ui";
import {NativeHost} from "../../components/native-host";
import {useState} from "react";
import {Pressable, View} from "react-native";
import {Globe, Lock, Shield} from "lucide-react-native";
import {AppText} from "../../components/ui";
import {colors} from "../../theme";
import type {MobileProfile} from "../../lib/api-client";

const privacy = {
    public: {
        Icon: Globe,
        color: colors.accent,
        title: "Public profile",
        explanation: "Anyone can view your profile and tracking lists, including visitors who aren’t signed in.",
    },
    restricted: {
        Icon: Shield,
        color: colors.rating,
        title: "Restricted profile",
        explanation: "Only people signed in to MyLists can view your profile and tracking lists.",
    },
    private: {
        Icon: Lock,
        color: colors.error,
        title: "Private profile",
        explanation:
            "Only followers you approve can view your profile and tracking lists. New followers must send a request.",
    },
};

export function PrivacyBadge({value}: {value: MobileProfile["user"]["privacy"]}) {
    const [open, setOpen] = useState(false);
    const {Icon, color, title, explanation} = privacy[value];
    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${title}. Explain privacy`}
                hitSlop={8}
                onPress={() => setOpen(true)}
                style={({pressed}) => ({padding: 10, opacity: pressed ? 0.5 : 1})}
            >
                <Icon size={21} color={color} />
            </Pressable>
            <NativeHost matchContents>
                <BottomSheet isPresented={open} onDismiss={() => setOpen(false)}>
                    <View style={{padding: 16, gap: 18}}>
                        <View style={{flexDirection: "row", alignItems: "center", gap: 12}}>
                            <Icon size={24} color={color} />
                            <AppText heading>{title}</AppText>
                        </View>
                        <AppText muted>{explanation}</AppText>
                        <NativeHost>
                            <Button label="Got it" onPress={() => setOpen(false)} />
                        </NativeHost>
                    </View>
                </BottomSheet>
            </NativeHost>
        </>
    );
}
