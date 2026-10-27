import {KeyRound, Mail} from "lucide-react-native";
import {useIsFocused} from "expo-router";
import {useQuery, useMutation} from "@tanstack/react-query";
import {authClient} from "../../lib/auth-client";
import {accountSecurityOptions} from "../../lib/react-query/query-options/settings.options";
import {SettingsFeedback} from "./settings-feedback";
import {useState} from "react";
import {StyleSheet, View} from "react-native";
import {colors} from "../../theme";
import {usePasswordMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {AppText, Button, Content, Field, Page, QueryPanel, Section, uiStyles} from "../../components/ui";


function PasswordForm() {
    const mutation = usePasswordMutation();
    const [confirm, setConfirm] = useState("");
    const [validation, setValidation] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");

    const submit = () => {
        setValidation("");

        if (!currentPassword || newPassword.length < 8 || newPassword.length > 50) {
            setValidation("Enter your current password and a new password of 8–50 characters.");

            return;
        }

        if (newPassword !== confirm) {
            setValidation("The new passwords do not match.");

            return;
        }

        mutation.mutate({ currentPassword, newPassword }, {
            onSuccess: () => {
                setConfirm("");
                setNewPassword("");
                setCurrentPassword("");
            },
        });
    };

    return (
        <>
            <Section
                title="Change password"
                icon={
                    <KeyRound size={18} color={colors.accent}/>
                }
            >
                <View style={uiStyles.padded}>
                    <Field
                        autoCapitalize="none"
                        secureTextEntry={true}
                        value={currentPassword}
                        label="Current password"
                        editable={!mutation.isPending}
                        autoComplete="current-password"
                        onChangeText={setCurrentPassword}
                    />
                    <Field
                        value={newPassword}
                        label="New password"
                        autoCapitalize="none"
                        secureTextEntry={true}
                        autoComplete="new-password"
                        onChangeText={setNewPassword}
                        editable={!mutation.isPending}
                    />
                    <Field
                        value={confirm}
                        autoCapitalize="none"
                        secureTextEntry={true}
                        onChangeText={setConfirm}
                        autoComplete="new-password"
                        label="Confirm new password"
                        editable={!mutation.isPending}
                    />
                    <AppText muted>
                        Changing your password signs out your other sessions.
                    </AppText>
                </View>
            </Section>
            {(validation || mutation.error) &&
                <AppText
                    accessibilityRole="alert"
                    style={styles.errorText}
                >
                    {validation || mutation.error?.message}
                </AppText>
            }
            {mutation.isSuccess &&
                <AppText
                    accessibilityRole="alert"
                    style={styles.accentText}
                >
                    Password changed.
                </AppText>
            }
            <Button
                fullWidth
                onPress={submit}
                label="Change password"
                pending={mutation.isPending}
            />
        </>
    );
}


function EmailForm() {
    const [email, setEmail] = useState("");
    const session = authClient.useSession();
    const mutation = useMutation({
        mutationFn: async () => {
            const result = await authClient.changeEmail({ newEmail: email.trim() });
            if (result.error) throw new Error(result.error.message ?? "Couldn’t change your email address.");
        },
        onSuccess: () => setEmail(""),
    });

    return (
        <Section
            title="Email address"
            icon={
                <Mail size={18} color={colors.accent}/>
            }
        >
            <View style={uiStyles.padded}>
                <AppText
                    muted
                    style={styles.caption}
                >Current email: {session.data?.user.email}</AppText>
                <AppText
                    muted
                    style={styles.caption}
                >
                    Approve the change from your current email address, then verify the new address.
                </AppText>
                <Field
                    label="New email address"
                    placeholder="new-email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!mutation.isPending}
                />
                <SettingsFeedback
                    error={mutation.error?.message}
                    success={mutation.isSuccess && "Check your current inbox to approve the change. After approval, check your new inbox to verify the new address."}
                />
                <Button
                    fullWidth
                    label="Change Email"
                    pending={mutation.isPending}
                    disabled={!email.trim()}
                    onPress={() => mutation.mutate()}
                />
            </View>
        </Section>
    );
}


export function SecurityScreen() {
    const focused = useIsFocused();
    const query = useQuery({ ...accountSecurityOptions, enabled: focused });

    return (
        <Page title="Email & password" back>
            <QueryPanel query={query}>
                {data =>
                    <Content>
                        <EmailForm/>
                        {data.hasPassword
                            ? <PasswordForm/>
                            :
                            <Section
                                title="Password"
                                icon={
                                    <KeyRound size={18} color={colors.accent}/>
                                }
                            >
                                <View style={uiStyles.padded}>
                                    <AppText muted>Your account has no password because you sign
                                        in
                                        with {data.providers.map(provider => provider === "google" ? "Google" : "GitHub").join(" or ")}. Manage your password with your
                                        sign-in
                                        provider.</AppText>
                                </View>
                            </Section>
                        }
                    </Content>
                }
            </QueryPanel>
        </Page>
    );
}


const styles = StyleSheet.create({
    errorText: { color: colors.error },
    accentText: { color: colors.accent },
    caption: { fontSize: 12 },
});
