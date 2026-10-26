import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Pressable, StyleSheet, View} from "react-native";
import {Brush, ChevronRight, CircleUserRound, KeyRound, LibraryBig, LogOut, Plug, ShieldAlert} from "lucide-react-native";
import {Button, Column, List, ListItem, RNHostView, Text} from "@expo/ui";
import {capitalize} from "@/lib/utils/formatting/text";
import {useTabPush} from "../../hooks/use-tab-push";
import {useConfirmation} from "../../hooks/use-confirmation";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {NativeHost} from "../../components/native-host";
import {fullWidthButtonModifiers} from "../../components/button-layout";
import {Avatar} from "../../components/avatar";
import {AppText, Page, QueryPanel} from "../../components/ui";
import {settingsOptions} from "../../lib/react-query/query-options/settings.options";
import {useSignOutMutation} from "../../lib/react-query/query-mutations/auth.mutations";
import {colors} from "../../theme";

const groups = [
    {
        title: "Make it yours", items: [
            { label: "General", detail: "Identity, images and privacy", path: "/settings/general", Icon: CircleUserRound },
            { label: "Content & lists", detail: "Media types, ratings and notifications", path: "/settings/content", Icon: LibraryBig },
            { label: "Profile customization", detail: "Continue preview and pinned lists", path: "/settings/profile", Icon: Brush },
        ]
    },
    {
        title: "Account & access", items: [
            { label: "Email & password", detail: "Sign-in details and security", path: "/settings/security", Icon: KeyRound },
            { label: "Connected apps", detail: "Assistant access and permissions", path: "/settings/apps", Icon: Plug },
        ]
    },
    {
        title: "Permanent actions", items: [
            { label: "Danger zone", detail: "Delete your account and its data", path: "/settings/danger", Icon: ShieldAlert },
        ]
    },
] as const;

export function SettingsScreen() {
    const push = useTabPush();
    const focused = useIsFocused();
    const query = useQuery({ ...settingsOptions, enabled: focused });
    const { confirmation, confirm, dismiss } = useConfirmation();
    const signOut = useSignOutMutation();
    return <Page title="Settings" back>
        <QueryPanel query={query}>{data => <View style={styles.fill}>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit your identity and profile privacy" onPress={() => push("/settings/general")}
                       style={({ pressed }) => [styles.account, pressed && styles.pressed]}>
                <Avatar image={data.image} name={data.username} size={56}/><View style={styles.identity}><AppText style={styles.username}>{data.username}</AppText><AppText muted
                                                                                                                                                                            style={styles.caption}>{capitalize(data.privacy)} profile</AppText></View><ChevronRight
                size={18} color={colors.muted}/>
            </Pressable>
            {signOut.error && <AppText accessibilityRole="alert" style={styles.error}>{signOut.error.message}</AppText>}
            <NativeHost matchContents={false} style={styles.fill}>
                <List>
                    {groups.map(group => <Column key={group.title} spacing={12} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                        <Text textStyle={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>{group.title}</Text>
                        <Column spacing={2} style={{ backgroundColor: colors.surface, borderRadius: 16 }}>
                            {group.items.map(({ label, detail, path, Icon }) => <ListItem key={path} onPress={() => push(path)} supportingText={detail}
                                                                                          colors={{ containerColor: colors.surface }}
                                                                                          leading={<RNHostView style={{ width: 36, height: 36 }}><View
                                                                                              style={[styles.icon, path === "/settings/danger" && styles.dangerIcon]}><Icon
                                                                                              size={20}
                                                                                              color={path === "/settings/danger" ? colors.error : colors.accent}/></View></RNHostView>}
                                                                                          trailing={<Text
                                                                                              textStyle={{ fontSize: 21, color: colors.muted }}>›</Text>}>{label}</ListItem>)}
                        </Column>
                    </Column>)}
                    <Column spacing={16} style={{ padding: 16 }}>
                        <Button label={signOut.isPending ? "Signing out…" : "Sign out"} variant="outlined" modifiers={fullWidthButtonModifiers} disabled={signOut.isPending}
                                onPress={() => confirm({
                                    title: "Sign out?",
                                    message: "You’ll need to sign in again to access your lists.",
                                    label: "Sign out",
                                    cancelLabel: "Stay signed in",
                                    icon: LogOut,
                                    onConfirm: () => signOut.mutate(),
                                })}/>
                        <Text textStyle={{ fontSize: 12, color: colors.muted }}>MyLists · Your media, in one place.</Text>
                    </Column>
                </List>
            </NativeHost>
        </View>}</QueryPanel>
        <ConfirmationSheet confirmation={confirmation} dismiss={dismiss}/>
    </Page>;
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    account: {
        margin: 16,
        marginBottom: 4,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 14
    },
    identity: { flex: 1, minWidth: 0, gap: 4 },
    username: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
    caption: { fontSize: 12, lineHeight: 18 },
    icon: { flex: 1, borderRadius: 11, backgroundColor: `${colors.accent}12`, alignItems: "center", justifyContent: "center" },
    dangerIcon: { backgroundColor: `${colors.error}12` },
    error: { padding: 16, color: colors.error },
    pressed: { opacity: 0.6 },
});
