import {useTabPush} from "../../hooks/use-tab-push";
import {useIsFocused} from "expo-router";
import {Alert, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {Button, FieldGroup, ListItem, Text} from "@expo/ui";
import {NativeHost} from "../../components/native-host";
import {AppText, Page, QueryPanel} from "../../components/ui";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSignOutMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {colors} from "../../theme";

export function SettingsScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const query = useQuery({ ...settingsOptions, enabled: focused });
    const signOut = useSignOutMutation();
    return (
        <Page title="Settings">
            <QueryPanel query={query}>
                {(data) => (
                    <View style={{ flex: 1 }}>
                        {signOut.error && (
                            <AppText accessibilityRole="alert" style={{ color: colors.error, padding: 16 }}>
                                {signOut.error.message}
                            </AppText>
                        )}
                        <NativeHost matchContents={false} style={{ flex: 1 }}>
                            <FieldGroup>
                                <FieldGroup.Section title={data.username}>
                                    <ListItem
                                        onPress={() => push("/settings/general")}
                                        supportingText="Username and profile privacy"
                                    >
                                        General
                                    </ListItem>
                                    <ListItem
                                        onPress={() => push("/settings/content")}
                                        supportingText="Active lists, rating system, and notifications"
                                    >
                                        Content & lists
                                    </ListItem>
                                    <ListItem
                                        onPress={() => push("/settings/security")}
                                        supportingText="Password and account access"
                                    >
                                        Security
                                    </ListItem>
                                </FieldGroup.Section>
                                <FieldGroup.Section>
                                    <Button
                                        label={signOut.isPending ? "Signing out…" : "Sign out"}
                                        variant="outlined"
                                        disabled={signOut.isPending}
                                        onPress={() =>
                                            Alert.alert(
                                                "Sign out?",
                                                "You’ll need to sign in again to access your lists.",
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    {
                                                        text: "Sign out",
                                                        style: "destructive",
                                                        onPress: () => signOut.mutate(),
                                                    },
                                                ],
                                            )
                                        }
                                    />
                                    <FieldGroup.SectionFooter>
                                        <Text>MyLists · Your media, in one place.</Text>
                                    </FieldGroup.SectionFooter>
                                </FieldGroup.Section>
                            </FieldGroup>
                        </NativeHost>
                    </View>
                )}
            </QueryPanel>
        </Page>
    );
}
