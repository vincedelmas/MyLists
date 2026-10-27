import {useState} from "react";
import {colors} from "../../theme";
import {Pressable} from "react-native";
import {BottomSheet, Button, Column, Text} from "@expo/ui";
import {NativeHost} from "../../components/native-host";
import {Globe, Lock, Shield} from "lucide-react-native";
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
        explanation: "Only followers you approve can view your profile and tracking lists. New followers must send a request.",
    },
};


export function PrivacyBadge({ value }: { value: MobileProfile["user"]["privacy"] }) {
    const [open, setOpen] = useState(false);
    const { Icon, color, title, explanation } = privacy[value];

    return (
        <>
            <Pressable
                hitSlop={8}
                accessibilityRole="button"
                onPress={() => setOpen(true)}
                accessibilityLabel={`${title}. Explain privacy`}
                style={({ pressed }) => ({ padding: 10, opacity: pressed ? 0.5 : 1 })}
            >
                <Icon size={21} color={color}/>
            </Pressable>
            <NativeHost matchContents>
                <BottomSheet
                    isPresented={open}
                    onDismiss={() => setOpen(false)}
                >
                    <Column
                        spacing={18}
                        style={{ padding: 16 }}
                    >
                        <Text textStyle={{ fontSize: 20, fontWeight: "600", color }}>
                            {title}
                        </Text>
                        <Text textStyle={{ color: colors.muted }}>
                            {explanation}
                        </Text>
                        <Button
                            label="Got it"
                            onPress={() => setOpen(false)}
                        />
                    </Column>
                </BottomSheet>
            </NativeHost>
        </>
    );
}
