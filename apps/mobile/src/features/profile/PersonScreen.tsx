import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {ScrollView, StyleSheet, View} from "react-native";
import {LockKeyhole} from "lucide-react-native";
import {colors} from "../../theme";
import {useSocialAction} from "../../lib/react-query/query-mutations/social.mutations";
import {personOptions} from "../../lib/react-query/query-options/profile.options";
import {AppText, Button, Page, QueryPanel} from "../../components/ui";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useConfirmation} from "../../hooks/use-confirmation";
import {ProfileHeader, ProfileLayout} from "./profile-layout";


export function PersonScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const focused = useIsFocused();
    const query = useQuery({ ...personOptions(Number(userId)), enabled: focused });
    const mutation = useSocialAction();
    const { confirmation, confirm, dismiss } = useConfirmation();

    return (
        <Page
            title="MyLists"
            brand
            back
        >
            <QueryPanel query={query}>
                {(data) => {
                    const action = (
                        <>
                            {!data.header.isOwn && (
                                <Button
                                    fullWidth
                                    pending={mutation.isPending}
                                    secondary={Boolean(data.following)}
                                    label={
                                        data.following === "accepted"
                                            ? "Following"
                                            : data.following === "requested"
                                                ? "Requested"
                                                : data.header.privacy === "private"
                                                    ? "Request to follow"
                                                    : "Follow"
                                    }
                                    onPress={() => {
                                        const perform = () =>
                                            mutation.mutate({
                                                targetId: data.header.id,
                                                action: data.following ? "unfollow" : "follow",
                                            });
                                        if (data.following === "accepted")
                                            confirm({
                                                title: "Unfollow this person?",
                                                message: `You will stop seeing ${data.header.name} in your follows feed.`,
                                                label: "Unfollow",
                                                onConfirm: perform,
                                            });
                                        else perform();
                                    }}
                                />
                            )
                            }
                            {mutation.error &&
                                <AppText accessibilityRole="alert">
                                    {mutation.error.message}
                                </AppText>
                            }
                        </>
                    );

                    return data.access === "private"
                        ? (
                            <ScrollView contentContainerStyle={styles.content}>
                                <ProfileHeader
                                    data={{ user: data.header }}
                                    action={action}
                                />
                                <View style={styles.privateState}>
                                    <View style={styles.lock}>
                                        <LockKeyhole size={25} color={colors.muted}/>
                                    </View>
                                    <AppText heading style={styles.privateTitle}>
                                        This profile is private
                                    </AppText>
                                    <AppText muted style={styles.privateMessage}>
                                        {data.following === "requested"
                                            ? "Your follow request is pending. Their lists and activity will appear once it’s accepted."
                                            : "Follow this person to request access to their lists and activity."}
                                    </AppText>
                                </View>
                            </ScrollView>
                        )
                        : (
                            <ProfileLayout
                                key={data.header.id}
                                data={data.profile}
                                refreshing={query.isRefetching}
                                userId={data.header.isOwn ? undefined : data.header.id}
                                headerAction={action}
                            />
                        );
                }
                }
            </QueryPanel>
            <ConfirmationSheet confirmation={confirmation} dismiss={dismiss}/>
        </Page>
    );
}


const styles = StyleSheet.create({
    privateState: {
        paddingHorizontal: 32,
        paddingVertical: 28,
        alignItems: "center",
        gap: 12
    },
    lock: {
        width: 62,
        height: 62,
        borderRadius: 22,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4
    },
    privateTitle: { fontSize: 20, lineHeight: 28, textAlign: "center" },
    privateMessage: {
        textAlign: "center",
        fontSize: 14,
        lineHeight: 22,
        maxWidth: 280
    },

    content: { gap: 16, paddingBottom: 24 },
});
