import {actionSheetModifiers} from "./action-sheet-insets";
import type {ReactNode} from "react";
import {BottomSheet, RNHostView} from "@expo/ui";
import {ScrollView, StyleSheet, View, useWindowDimensions} from "react-native";
import {NativeHost} from "./native-host";
import {AppText} from "./ui";
import {colors, spacing} from "../theme";


export function ActionSheet({
                                title,
                                error,
                                dismiss,
                                children,
                                compact = false,
                                scrollable = true,
                                suspended = false,
                            }: {
    title: string;
    error?: string;
    dismiss: () => void;
    children: ReactNode;
    compact?: boolean;
    scrollable?: boolean;
    suspended?: boolean;
}) {
    const Container = scrollable ? ScrollView : View;
    const { width, height } = useWindowDimensions();

    return (
        <NativeHost
            style={styles.host}
            matchContents={false}
            pointerEvents="none"
        >
            <BottomSheet
                isPresented={!suspended}
                onDismiss={() => {
                    if (!suspended) dismiss();
                }}
                modifiers={actionSheetModifiers}
                containerColor={colors.surface}
            >
                <RNHostView matchContents={{ vertical: true }}>
                    <View style={{ width: width - 48, maxHeight: height * 0.72 }}>
                        <Container
                            {...(scrollable ? { keyboardShouldPersistTaps: "handled" as const } : {})}
                            {...(scrollable ? { contentContainerStyle: [styles.content, compact && { gap: spacing.lg }] } : {})}
                            style={[
                                { flexGrow: 0, flexShrink: 1 },
                                !scrollable && styles.content
                            ]}
                        >
                            {!compact &&
                                <AppText heading>
                                    {title}
                                </AppText>
                            }
                            {error && (
                                <AppText accessibilityRole="alert" style={styles.error}>
                                    {error}
                                </AppText>
                            )
                            }
                            {children}
                        </Container>
                    </View>
                </RNHostView>
            </BottomSheet>
        </NativeHost>
    );
}


const styles = StyleSheet.create({
    host: { position: "absolute" },
    content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
    error: { color: colors.error },
});
