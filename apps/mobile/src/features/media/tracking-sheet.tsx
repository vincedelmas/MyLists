import {trackingSheetModifiers} from "./tracking-sheet-insets";
import type {ReactNode} from "react";
import {BottomSheet, RNHostView} from "@expo/ui";
import {ScrollView, StyleSheet, View, useWindowDimensions} from "react-native";
import {NativeHost} from "../../components/native-host";
import {AppText} from "../../components/ui";
import {colors, spacing} from "../../theme";

export function TrackingSheet({
                                  title,
                                  error,
                                  dismiss,
                                  children,
                              }: {
    title: string;
    error?: string;
    dismiss: () => void;
    children: ReactNode;
}) {
    const { width, height } = useWindowDimensions();
    return (
        <NativeHost>
            <BottomSheet
                isPresented
                onDismiss={dismiss}
                modifiers={trackingSheetModifiers}
                containerColor={colors.surface}
            >
                <RNHostView matchContents={{ vertical: true }}>
                    <View style={{ width: width - 48, maxHeight: height * 0.72 }}>
                        <ScrollView
                            style={{ flexGrow: 0 }}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.content}
                        >
                            <AppText heading>{title}</AppText>
                            {error && (
                                <AppText accessibilityRole="alert" style={styles.error}>
                                    {error}
                                </AppText>
                            )}
                            {children}
                        </ScrollView>
                    </View>
                </RNHostView>
            </BottomSheet>
        </NativeHost>
    );
}

const styles = StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
    error: { color: colors.error },
});
