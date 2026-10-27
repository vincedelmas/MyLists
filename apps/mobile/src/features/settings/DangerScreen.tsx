import {useState} from "react";
import {useIsFocused} from "expo-router";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {StyleSheet, View} from "react-native";
import {Trash2} from "lucide-react-native";
import {api} from "../../lib/api-client";
import {authClient} from "../../lib/auth-client";
import {accountSecurityOptions} from "../../lib/react-query/query-options/settings.options";
import {AppText, Button, Content, Field, Page, QueryPanel, Section, uiStyles} from "../../components/ui";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {colors} from "../../theme";


export function DangerScreen() {
    const focused = useIsFocused();
    const client = useQueryClient();
    const query = useQuery({ ...accountSecurityOptions, enabled: focused });
    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [validation, setValidation] = useState("");
    const mutation = useMutation({
        mutationFn: api.deleteAccount,
        onSuccess: async () => {
            setOpen(false);
            await authClient.signOut();
            authClient.$store.notify("$sessionSignal");
            client.clear();
        }
    });
    const dismiss = () => {
        setOpen(false);
        if (!mutation.isPending) {
            setPassword("");
            setConfirmation("");
            setValidation("");
            mutation.reset();
        }
    };

    return (
        <Page title="Danger zone" back>
            <QueryPanel query={query}>
                {data => {
                    const needsPassword = data.hasPassword || data.providers.length === 0;

                    return (
                        <>
                            <Content>
                                <Section
                                    title="Delete Account"
                                    icon={
                                        <Trash2 size={20} color={colors.error}/>
                                    }
                                    description="Permanent account actions"
                                >
                                    <View style={uiStyles.padded}>
                                        <AppText style={styles.errorText}>
                                            Permanently remove your account and all associated data. This action is not reversible.
                                        </AppText>
                                        <Button
                                            fullWidth
                                            danger
                                            disabled={mutation.isPending}
                                            label="Delete Account"
                                            onPress={() => setOpen(true)}
                                        />
                                    </View>
                                </Section>
                            </Content>
                            <ConfirmationSheet
                                pending={mutation.isPending}
                                error={validation || mutation.error?.message}
                                dismiss={dismiss}
                                confirmation={open
                                    ? {
                                        title: "Delete Your Account?",
                                        message: `All your data will be permanently deleted. This action cannot be undone. ${needsPassword ? "Enter your current password to confirm." : "Type DELETE to confirm."}`,
                                        label: "Delete Account",
                                        cancelLabel: "Cancel",
                                        icon: Trash2,
                                        closeOnConfirm: false,
                                        onConfirm: () => {
                                            setValidation("");
                                            if (needsPassword && !password) {
                                                setValidation("Current password is required.");

                                                return;
                                            }
                                            if (!needsPassword && confirmation !== "DELETE") {
                                                setValidation("Type DELETE to confirm account deletion.");

                                                return;
                                            }
                                            mutation.mutate(needsPassword ? { currentPassword: password } : { confirmation });
                                        },
                                    }
                                    : null}
                            >
                                {needsPassword
                                    ? <Field
                                        label="Current password"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoComplete="current-password"
                                        editable={!mutation.isPending}
                                    />
                                    :
                                    <Field
                                        label="Type DELETE"
                                        value={confirmation}
                                        onChangeText={setConfirmation}
                                        autoCorrect={false}
                                        autoCapitalize="characters"
                                        editable={!mutation.isPending}
                                    />
                                }
                            </ConfirmationSheet>
                        </>
                    );
                }
                }
            </QueryPanel>
        </Page>
    );
}


const styles = StyleSheet.create({
    errorText: { color: colors.error },
});
