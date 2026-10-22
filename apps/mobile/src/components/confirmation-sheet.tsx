import { BottomSheet, RNHostView } from "@expo/ui";
import { View, useWindowDimensions } from "react-native";
import { UserRoundMinus } from "lucide-react-native";
import { NativeHost } from "./native-host";
import { AppText, Button } from "./ui";
import type { Confirmation } from "../hooks/use-confirmation";
import { colors } from "../theme";

export function ConfirmationSheet({
    confirmation,
    dismiss,
}: {
    confirmation: Confirmation | null;
    dismiss: () => void;
}) {
    const { width } = useWindowDimensions();
    if (!confirmation) return null;
    return (
        <NativeHost>
            <BottomSheet isPresented onDismiss={dismiss}>
                <RNHostView matchContents={{ vertical: true }}>
                    <View style={{ width: width - 48, padding: 16, gap: 18 }}>
                        <View
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: colors.secondary,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <UserRoundMinus size={24} color={colors.error} />
                        </View>
                        <AppText heading style={{ fontSize: 21 }}>
                            {confirmation.title}
                        </AppText>
                        <AppText muted>{confirmation.message}</AppText>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "flex-end" }}>
                            <Button secondary label="Keep connection" onPress={dismiss} />
                            <Button
                                danger
                                label={confirmation.label}
                                onPress={() => {
                                    dismiss();
                                    confirmation.onConfirm();
                                }}
                            />
                        </View>
                    </View>
                </RNHostView>
            </BottomSheet>
        </NativeHost>
    );
}
