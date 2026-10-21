import {useState} from "react";
import {Modal, Pressable, View} from "react-native";
import {Globe, Lock, Shield, X} from "lucide-react-native";
import {AppText, Button} from "../../components/ui";
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
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <View style={{flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#00000099"}}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close privacy explanation"
                        onPress={() => setOpen(false)}
                        style={{position: "absolute", inset: 0}}
                    />
                    <View
                        accessibilityViewIsModal
                        style={{
                            padding: 24,
                            gap: 18,
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth: 1,
                            borderRadius: 20,
                        }}
                    >
                        <View style={{flexDirection: "row", alignItems: "center", gap: 12}}>
                            <Icon size={24} color={color} />
                            <AppText heading style={{flex: 1}}>
                                {title}
                            </AppText>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                hitSlop={10}
                                onPress={() => setOpen(false)}
                            >
                                <X size={20} color={colors.muted} />
                            </Pressable>
                        </View>
                        <AppText muted>{explanation}</AppText>
                        <Button secondary label="Got it" onPress={() => setOpen(false)} />
                    </View>
                </View>
            </Modal>
        </>
    );
}
