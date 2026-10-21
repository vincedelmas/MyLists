import {useIsFocused} from "expo-router";
import {Alert} from "react-native";
import {router} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {CircleUserRound, Library, LockKeyhole} from "lucide-react-native";
import {AppText, Button, Content, MenuRow, Page, QueryPanel, Section} from "../../components/ui";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSignOutMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {colors} from "../../theme";

export function SettingsScreen() {
    const focused = useIsFocused();
    const query = useQuery({...settingsOptions, enabled: focused});
    const signOut = useSignOutMutation();
    return (
        <Page title="Settings">
            <QueryPanel query={query}>
                {(data) => (
                    <Content>
                        <Section title={data.username}>
                            <MenuRow
                                title="General"
                                detail="Username and profile privacy"
                                icon={<CircleUserRound size={22} color={colors.muted} />}
                                onPress={() => router.push("/settings/general")}
                            />
                            <MenuRow
                                title="Content & lists"
                                detail="Active lists, rating system, and notifications"
                                icon={<Library size={22} color={colors.muted} />}
                                onPress={() => router.push("/settings/content")}
                            />
                            <MenuRow
                                title="Security"
                                detail="Change your password"
                                icon={<LockKeyhole size={22} color={colors.muted} />}
                                onPress={() => router.push("/settings/security")}
                            />
                        </Section>
                        {signOut.error && (
                            <AppText accessibilityRole="alert" style={{color: colors.error}}>
                                {signOut.error.message}
                            </AppText>
                        )}
                        <Button
                            label="Sign out"
                            pending={signOut.isPending}
                            secondary
                            onPress={() =>
                                Alert.alert("Sign out?", "You’ll need to sign in again to access your lists.", [
                                    {text: "Cancel", style: "cancel"},
                                    {text: "Sign out", style: "destructive", onPress: () => signOut.mutate()},
                                ])
                            }
                        />
                        <AppText muted style={{textAlign: "center", fontSize: 12}}>
                            MyLists · Your media, in one place.
                        </AppText>
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}
