import { useTabPush } from "../../hooks/use-tab-push";
import { colors } from "../../theme";
import { TopTabs } from "../../components/top-tabs";
import { useEffect, useState } from "react";
import type { api } from "../../lib/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIsFocused, useLocalSearchParams } from "expo-router";
import { FlatList, View, Alert, RefreshControl, Pressable } from "react-native";
import { recordNavigationTiming } from "../../lib/diagnostics/navigation-timing";
import { socialOptions } from "../../lib/react-query/query-options/social.options";
import { AppText, Button, Cover, Page, StateView } from "../../components/ui";
import { useSocialAction } from "../../lib/react-query/query-mutations/social.mutations";

type Kind = Parameters<typeof api.social>[0]["kind"];

const kinds: { value: Kind; label: string }[] = [
    { value: "followers", label: "Followers" },
    { value: "following", label: "Following" },
    { value: "requests", label: "Follow requests" },
    { value: "pending", label: "Sent requests" },
];

export function SocialScreen() {
    const focused = useIsFocused();
    const push = useTabPush();
    const mutation = useSocialAction();
    const params = useLocalSearchParams<{ kind?: Kind; userId?: string }>();
    const [kind, setKind] = useState<Kind>(params.kind ?? "followers");
    const query = useInfiniteQuery({
        ...socialOptions(kind, params.userId ? Number(params.userId) : undefined),
        enabled: focused,
    });

    useEffect(() => {
        if (query.isSuccess) recordNavigationTiming("data-ready", "/profile/social");
        else if (query.isError) recordNavigationTiming("data-error", "/profile/social");
    }, [query.isSuccess, query.isError, query.dataUpdatedAt]);

    const act = (targetId: number, action: Parameters<typeof api.socialAction>[0]["action"]) => {
        return mutation.mutate({ targetId, action });
    };

    const items = query.data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <Page title={params.userId ? "Connections" : "Your connections"} back>
            <TopTabs
                value={kind}
                tabs={
                    params.userId
                        ? kinds.filter((item) => item.value === "followers" || item.value === "following")
                        : kinds
                }
                onChange={setKind}
            />
            {mutation.error && (
                <AppText accessibilityRole="alert" style={{ color: colors.error, padding: 16 }}>
                    {mutation.error.message}
                </AppText>
            )}
            <FlatList
                key={kind}
                data={items}
                windowSize={7}
                initialNumToRender={12}
                onEndReachedThreshold={0.5}
                keyExtractor={(item) => String(item.id)}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) {
                        void query.fetchNextPage();
                    }
                }}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        onRefresh={() => void query.refetch()}
                        refreshing={query.isRefetching && !query.isFetchingNextPage}
                    />
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        message={query.error?.message}
                        retry={query.isError ? () => void query.refetch() : undefined}
                        title={query.isError ? "Couldn’t load connections" : "Nothing to display yet :)"}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading={true} />
                    ) : query.isError && items.length ? (
                        <StateView title="Couldn’t load more" retry={() => void query.fetchNextPage()} />
                    ) : undefined
                }
                renderItem={({ item }) => (
                    <View style={{ padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`View ${item.username}'s profile`}
                                onPress={() =>
                                    push({ pathname: "/people/[userId]", params: { userId: String(item.id) } })
                                }
                            >
                                <Cover
                                    uri={item.image}
                                    label={item.username}
                                    style={{ width: 42, height: 42, borderRadius: 21 }}
                                />
                            </Pressable>
                            <AppText style={{ flex: 1, fontWeight: "600" }}>{item.username}</AppText>
                        </View>
                        {kind === "requests" ? (
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                <Button
                                    label="Accept"
                                    disabled={mutation.isPending}
                                    onPress={() => act(item.id, "accept")}
                                />
                                <Button
                                    secondary
                                    label="Decline"
                                    disabled={mutation.isPending}
                                    onPress={() => act(item.id, "decline")}
                                />
                            </View>
                        ) : (
                            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                {!item.isOwn && (
                                    <Button
                                        secondary
                                        disabled={mutation.isPending}
                                        label={
                                            item.myFollowStatus === "accepted"
                                                ? "Unfollow"
                                                : item.myFollowStatus === "requested"
                                                  ? "Cancel request"
                                                  : item.privacy === "private"
                                                    ? "Request to follow"
                                                    : "Follow"
                                        }
                                        onPress={() =>
                                            item.myFollowStatus === "accepted"
                                                ? Alert.alert("Unfollow?", `Stop following ${item.username}?`, [
                                                      { text: "Keep following", style: "cancel" },
                                                      {
                                                          text: "Unfollow",
                                                          style: "destructive",
                                                          onPress: () => act(item.id, "unfollow"),
                                                      },
                                                  ])
                                                : act(item.id, item.myFollowStatus ? "unfollow" : "follow")
                                        }
                                    />
                                )}
                                {kind === "followers" && !params.userId && (
                                    <Button
                                        secondary
                                        label="Remove follower"
                                        disabled={mutation.isPending}
                                        onPress={() =>
                                            Alert.alert(
                                                "Remove follower?",
                                                `${item.username} will stop following you.`,
                                                [
                                                    { text: "Cancel", style: "cancel" },
                                                    {
                                                        text: "Remove",
                                                        style: "destructive",
                                                        onPress: () => act(item.id, "remove"),
                                                    },
                                                ],
                                            )
                                        }
                                    />
                                )}
                            </View>
                        )}
                    </View>
                )}
            />
        </Page>
    );
}
