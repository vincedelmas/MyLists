import type {ReactNode} from "react";
import {StyleSheet, View} from "react-native";
import {UserRoundMinus} from "lucide-react-native";
import {ActionSheet} from "./action-sheet";
import {AppText, Button} from "./ui";
import type {Confirmation} from "../hooks/use-confirmation";
import {colors} from "../theme";


export function ConfirmationSheet({
                                      confirmation,
                                      dismiss,
                                      pending,
                                      error,
                                      children,
                                  }: {
    confirmation: Confirmation | null;
    dismiss: () => void;
    pending?: boolean;
    error?: string;
    children?: ReactNode;
}) {
    if (!confirmation) return null;
    const Icon = confirmation.icon ?? UserRoundMinus;

    return (
        <ActionSheet
            title={confirmation.title}
            compact
            dismiss={dismiss}
        >
            <View
                style={styles.centered}
            >
                <Icon size={24} color={colors.error}/>
            </View>
            <AppText
                heading
                style={styles.text}
            >
                {confirmation.title}
            </AppText>
            <AppText muted>
                {confirmation.message}
            </AppText>
            {children}
            {error &&
                <AppText
                    accessibilityRole="alert"
                    style={styles.errorText}
                >
                    {error}
                </AppText>
            }
            <View
                style={styles.row}
            >
                <Button
                    secondary
                    disabled={pending}
                    label={confirmation.cancelLabel ?? "Keep connection"}
                    onPress={dismiss}
                />
                <Button
                    danger
                    pending={pending}
                    label={confirmation.label}
                    onPress={() => {
                        if (confirmation.closeOnConfirm !== false) dismiss();
                        confirmation.onConfirm();
                    }}
                />
            </View>
        </ActionSheet>
    );
}


const styles = StyleSheet.create({
    centered: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.secondary,
        alignItems: "center",
        justifyContent: "center",
    },
    text: { fontSize: 21 },
    errorText: { color: colors.error },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "flex-end"
    },
});
