import { useIsFocused, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, ScrollView } from "react-native";
import { useSocialAction } from "../../lib/react-query/query-mutations/social.mutations";
import { personOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Button, Page, QueryPanel } from "../../components/ui";
import { ProfileHeader, ProfileLayout } from "./profile-layout";

export function PersonScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const focused = useIsFocused();
    const query = useQuery({ ...personOptions(Number(userId)), enabled: focused });
    const mutation = useSocialAction();
    return (
        <Page title="MyLists" brand back>
            <QueryPanel query={query}>
                {(data) => {
                    const action = (
                        <>
                            {!data.header.isOwn && (
                                <Button
                                    pending={mutation.isPending}
                                    label={
                                        data.following === "accepted"
                                            ? "Unfollow"
                                            : data.following === "requested"
                                              ? "Cancel request"
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
                                            Alert.alert("Unfollow?", `Stop following ${data.header.name}?`, [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Unfollow", style: "destructive", onPress: perform },
                                            ]);
                                        else perform();
                                    }}
                                />
                            )}
                            {mutation.error && <AppText accessibilityRole="alert">{mutation.error.message}</AppText>}
                        </>
                    );
                    return data.access === "private" ? (
                        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                            <ProfileHeader data={{ user: data.header }} action={action} />
                            <AppText muted style={{ paddingHorizontal: 16 }}>
                                This profile is private. Follow this person to request access.
                            </AppText>
                        </ScrollView>
                    ) : (
                        <ProfileLayout
                            key={data.header.id}
                            data={data.profile}
                            refreshing={query.isRefetching}
                            userId={data.header.isOwn ? undefined : data.header.id}
                            headerAction={action}
                        />
                    );
                }}
            </QueryPanel>
        </Page>
    );
}
