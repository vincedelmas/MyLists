import {useState} from "react";
import {View} from "react-native";
import {colors} from "../../theme";
import {usePasswordMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {AppText, Button, Content, Field, Page, Section, uiStyles} from "../../components/ui";


export function SecurityScreen() {
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
        <Page title="Security" back>
            <Content>
                <Section title="Change password">
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
                    <AppText accessibilityRole="alert" style={{ color: colors.error }}>
                        {validation || mutation.error?.message}
                    </AppText>
                }

                {mutation.isSuccess &&
                    <AppText accessibilityRole="alert" style={{ color: colors.accent }}>
                        Password changed.
                    </AppText>
                }

                <Button
                    onPress={submit}
                    label="Change password"
                    pending={mutation.isPending}
                />
            </Content>
        </Page>
    );
}
