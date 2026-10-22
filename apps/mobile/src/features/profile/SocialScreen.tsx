import {recordNavigationTiming} from "../../lib/diagnostics/navigation-timing";
import {useEffect, useState} from "react";
import {FlatList, View, Alert, RefreshControl} from "react-native";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {AppText, Button, Cover, Page, Select, StateView} from "../../components/ui";
import {socialOptions} from "../../lib/react-query/query-options/social.options";
import {useSocialAction} from "../../lib/react-query/query-mutations/social.mutations";
import {colors} from "../../theme";
import type {api} from "../../lib/api-client";

type Kind = Parameters<typeof api.social>[0]["kind"];
const kinds: {value: Kind; label: string}[] = [
    {value: "followers", label: "Followers"},
    {value: "following", label: "Following"},
    {value: "requests", label: "Follow requests"},
    {value: "pending", label: "Sent requests"},
];

export function SocialScreen() {
    const params = useLocalSearchParams<{kind?: Kind}>();
    const [kind, setKind] = useState<Kind>(params.kind ?? "followers");
    const focused = useIsFocused();
    const query = useInfiniteQuery({...socialOptions(kind), enabled: focused});
    useEffect(() => {
        if (query.isSuccess) recordNavigationTiming("data-ready", "/profile/social");
        else if (query.isError) recordNavigationTiming("data-error", "/profile/social");
    }, [query.isSuccess, query.isError, query.dataUpdatedAt]);
    const mutation = useSocialAction();
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    const act = (targetId: number, action: Parameters<typeof api.socialAction>[0]["action"]) =>
        mutation.mutate({targetId, action});
    return (
        <Page title="Your connections" back>
            <View style={{padding: 16}}>
                <Select label="Show" value={kind} options={kinds} onChange={(value) => setKind(value as Kind)} />
            </View>
            {mutation.error && (
                <AppText accessibilityRole="alert" style={{color: colors.error, padding: 16}}>
                    {mutation.error.message}
                </AppText>
            )}
            <FlatList
                key={kind}
                data={items}
                keyExtractor={(item) => String(item.id)}
                initialNumToRender={12}
                windowSize={7}
                refreshControl={
                    <RefreshControl
                        refreshing={query.isRefetching && !query.isFetchingNextPage}
                        onRefresh={() => void query.refetch()}
                        tintColor={colors.accent}
                    />
                }
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
                }}
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.isError ? "Couldn’t load connections" : "No connections here yet"}
                        message={query.error?.message}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                ListFooterComponent={
                    query.isFetchingNextPage ? (
                        <StateView loading />
                    ) : query.isError && items.length ? (
                        <StateView title="Couldn’t load more" retry={() => void query.fetchNextPage()} />
                    ) : undefined
                }
                renderItem={({item}) => (
                    <View style={{padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border}}>
                        <View style={{flexDirection: "row", gap: 12, alignItems: "center"}}>
                            <Cover
                                uri={item.image}
                                label={item.username}
                                style={{width: 42, height: 42, borderRadius: 21}}
                            />
                            <AppText style={{flex: 1, fontWeight: "600"}}>{item.username}</AppText>
                        </View>
                        {kind === "requests" ? (
                            <View style={{flexDirection: "row", gap: 10}}>
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
                            <View style={{flexDirection: "row", gap: 10, flexWrap: "wrap"}}>
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
                                                  {text: "Keep following", style: "cancel"},
                                                  {
                                                      text: "Unfollow",
                                                      style: "destructive",
                                                      onPress: () => act(item.id, "unfollow"),
                                                  },
                                              ])
                                            : act(item.id, item.myFollowStatus ? "unfollow" : "follow")
                                    }
                                />
                                {kind === "followers" && (
                                    <Button
                                        secondary
                                        label="Remove follower"
                                        disabled={mutation.isPending}
                                        onPress={() =>
                                            Alert.alert(
                                                "Remove follower?",
                                                `${item.username} will stop following you.`,
                                                [
                                                    {text: "Cancel", style: "cancel"},
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
