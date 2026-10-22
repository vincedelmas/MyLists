import { useIsFocused, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, View } from "react-native";
import { useSocialAction } from "../../lib/react-query/query-mutations/social.mutations";
import { personOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Button, Content, Cover, Page, QueryPanel, Section } from "../../components/ui";
import { PrivacyBadge } from "./PrivacyBadge";
import { formatActivity, formatCount } from "./profile-formatting";
import { mediaLabels } from "../../lib/media";

export function PersonScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const focused = useIsFocused();
    const query = useQuery({ ...personOptions(Number(userId)), enabled: focused });
    const mutation = useSocialAction();
    return (
        <Page title={query.data?.header.name ?? "Profile"} back>
            <QueryPanel query={query}>
                {(data) => (
                    <Content>
                        <Cover uri={data.header.backgroundImage} style={{ width: "100%", height: 128 }} />
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Cover
                                uri={data.header.image}
                                label={data.header.name}
                                style={{ width: 64, height: 64, borderRadius: 32 }}
                            />
                            <AppText heading style={{ flex: 1 }}>
                                {data.header.name}
                            </AppText>
                            <PrivacyBadge value={data.header.privacy} />
                        </View>
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
                        {data.access === "private" ? (
                            <AppText muted>This profile is private. Follow this person to request access.</AppText>
                        ) : (
                            <>
                                <AppText muted>
                                    {formatCount(data.profile.social.followersCount)} followers ·{" "}
                                    {formatCount(data.profile.social.followsCount)} following
                                </AppText>
                                <Section title="Media lists">
                                    {data.profile.lists.map((item) => (
                                        <View key={item.mediaType} style={{ padding: 12, gap: 4 }}>
                                            <AppText>
                                                {mediaLabels[item.mediaType]} · Level {Math.floor(item.level)}
                                            </AppText>
                                            <AppText muted>
                                                {formatCount(item.totalEntries)} titles · {formatCount(item.timeSpent)}{" "}
                                                hours
                                            </AppText>
                                        </View>
                                    ))}
                                </Section>
                                <Section title="Recent feed">
                                    {data.activity.map((item) => (
                                        <View key={item.id} style={{ padding: 12, gap: 4 }}>
                                            <AppText>{item.mediaName}</AppText>
                                            <AppText muted>
                                                {formatActivity(item, data.profile.user.ratingSystem)}
                                            </AppText>
                                        </View>
                                    ))}
                                </Section>
                            </>
                        )}
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}
