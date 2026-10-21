import {useState} from "react";
import {AppText, Button, Content, Field, Page, Section, uiStyles} from "../../components/ui";
import {View} from "react-native";
import {usePasswordMutation} from "../../lib/react-query/query-mutations/settings.mutations";
import {colors} from "../../theme";

export function SecurityScreen() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [validation, setValidation] = useState("");
    const mutation = usePasswordMutation();
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
        mutation.mutate(
            {currentPassword, newPassword},
            {
                onSuccess: () => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirm("");
                },
            },
        );
    };
    return (
        <Page title="Security" back>
            <Content>
                <Section title="Change password">
                    <View style={uiStyles.padded}>
                        <Field
                            label="Current password"
                            editable={!mutation.isPending}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            textContentType="password"
                            autoComplete="current-password"
                            autoCapitalize="none"
                        />
                        <Field
                            label="New password"
                            editable={!mutation.isPending}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            textContentType="newPassword"
                            autoComplete="new-password"
                            autoCapitalize="none"
                        />
                        <Field
                            label="Confirm new password"
                            editable={!mutation.isPending}
                            value={confirm}
                            onChangeText={setConfirm}
                            secureTextEntry
                            textContentType="newPassword"
                            autoCapitalize="none"
                        />
                        <AppText muted>Changing your password signs out your other sessions.</AppText>
                    </View>
                </Section>
                {(validation || mutation.error) && (
                    <AppText accessibilityRole="alert" style={{color: colors.error}}>
                        {validation || mutation.error?.message}
                    </AppText>
                )}
                {mutation.isSuccess && (
                    <AppText accessibilityRole="alert" style={{color: colors.accent}}>
                        Password changed.
                    </AppText>
                )}
                <Button label="Change password" pending={mutation.isPending} onPress={submit} />
            </Content>
        </Page>
    );
}
