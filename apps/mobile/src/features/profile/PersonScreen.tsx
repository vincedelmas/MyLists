import { useIsFocused, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView } from "react-native";
import { useSocialAction } from "../../lib/react-query/query-mutations/social.mutations";
import { personOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Button, Page, QueryPanel } from "../../components/ui";
import { ConfirmationSheet } from "../../components/confirmation-sheet";
import { useConfirmation } from "../../hooks/use-confirmation";
import { ProfileHeader, ProfileLayout } from "./profile-layout";

export function PersonScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const focused = useIsFocused();
    const query = useQuery({ ...personOptions(Number(userId)), enabled: focused });
    const mutation = useSocialAction();
    const { confirmation, confirm, dismiss } = useConfirmation();
    return (
        <Page title="MyLists" brand back>
            <QueryPanel query={query}>
                {(data) => {
                    const action = (
                        <>
                            {!data.header.isOwn && (
                                <Button
                                    width={176}
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
            <ConfirmationSheet confirmation={confirmation} dismiss={dismiss} />
        </Page>
    );
}
