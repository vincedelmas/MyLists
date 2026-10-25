import { useTabPush } from "../../hooks/use-tab-push";
import { useSwipeTabs } from "../../hooks/use-swipe-tabs";
import { colors } from "../../theme";
import { ConfirmationSheet } from "../../components/confirmation-sheet";
import { useConfirmation } from "../../hooks/use-confirmation";
import { SectionTabs } from "../../components/section-tabs";
import { UsersRound, UserRoundCheck, UserRoundPlus, Send, MoreHorizontal, type LucideIcon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import type { api } from "../../lib/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIsFocused, useLocalSearchParams } from "expo-router";
import { FlatList, View, RefreshControl, Pressable } from "react-native";
import { recordNavigationTiming } from "../../lib/diagnostics/navigation-timing";
import { socialOptions } from "../../lib/react-query/query-options/social.options";
import { AppText, Button, Cover, Page, StateView } from "../../components/ui";
import { useSocialAction } from "../../lib/react-query/query-mutations/social.mutations";

type Kind = Parameters<typeof api.social>[0]["kind"];

const kinds: { value: Kind; label: string; icon: LucideIcon }[] = [
    { value: "followers", label: "Followers", icon: UsersRound },
    { value: "following", label: "Following", icon: UserRoundCheck },
    { value: "requests", label: "Requests", icon: UserRoundPlus },
    { value: "pending", label: "Sent", icon: Send },
];

export function SocialScreen() {
    const focused = useIsFocused();
    const push = useTabPush();
    const mutation = useSocialAction();
    const { confirmation, confirm, dismiss } = useConfirmation();
    const params = useLocalSearchParams<{ kind?: Kind; userId?: string }>();
    const [kind, setKind] = useState<Kind>(params.kind ?? "followers");
    const tabs = useMemo(() => params.userId
        ? kinds.filter((item) => item.value === "followers" || item.value === "following")
        : kinds, [params.userId]);
    const swipeHandlers = useSwipeTabs(tabs, kind, setKind);
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
        <Page title="Connections" brand back>
            <View style={{ flex: 1 }} {...swipeHandlers}>
                <View style={{ paddingTop: 10 }}>
                    <SectionTabs
                        value={kind}
                        tabs={tabs.map((tab) => ({...tab, count: query.data?.pages[0]?.counts[tab.value]}))}
                        onChange={setKind}
                    />
                </View>
                {mutation.error && (
                    <AppText accessibilityRole="alert" style={{ color: colors.error, padding: 16 }}>
                        {mutation.error.message}
                    </AppText>
                )}
                <FlatList
                    key={kind}
                    data={items}
                    contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
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
                            title={
                                query.isError
                                    ? "Couldn’t load connections"
                                    : kind === "requests"
                                      ? "No follow requests"
                                      : kind === "pending"
                                        ? "No pending requests"
                                        : `No ${kind} yet`
                            }
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
                        <View
                            style={{
                                gap: 12,
                                padding: 14,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${item.username}'s profile`}
                                    onPress={() =>
                                        push({ pathname: "/people/[userId]", params: { userId: String(item.id) } })
                                    }
                                    style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
                                >
                                    <Cover
                                        uri={item.image}
                                        label={item.username}
                                        style={{ width: 48, height: 48, borderRadius: 24 }}
                                    />
                                    <View style={{ flex: 1, gap: 3 }}>
                                        <AppText numberOfLines={1} style={{ fontWeight: "600", fontSize: 15 }}>
                                            {item.username}
                                        </AppText>
                                        <AppText muted style={{ fontSize: 11 }}>
                                            {item.isOwn
                                                ? "You"
                                                : item.myFollowStatus === "requested"
                                                  ? "Request pending"
                                                  : item.myFollowStatus === "accepted"
                                                    ? "Following"
                                                    : item.privacy === "private"
                                                      ? "Private profile"
                                                      : "View profile"}
                                        </AppText>
                                    </View>
                                </Pressable>
                                {kind !== "requests" && !item.isOwn && (
                                    <View style={{ width: 140, alignItems: "center" }}>
                                        <Button
                                            width={140}
                                            secondary={Boolean(item.myFollowStatus)}
                                            disabled={mutation.isPending}
                                            pending={mutation.isPending && mutation.variables?.targetId === item.id}
                                            label={
                                                item.myFollowStatus === "accepted"
                                                    ? "Following"
                                                    : item.myFollowStatus === "requested"
                                                      ? "Cancel"
                                                      : "Follow"
                                            }
                                            onPress={() =>
                                                item.myFollowStatus === "accepted"
                                                    ? confirm({
                                                          title: "Unfollow this person?",
                                                          message: `Stop seeing ${item.username} in your follows feed?`,
                                                          label: "Unfollow",
                                                          onConfirm: () => act(item.id, "unfollow"),
                                                      })
                                                    : act(item.id, item.myFollowStatus ? "unfollow" : "follow")
                                            }
                                        />
                                    </View>
                                )}
                                {kind === "followers" && !params.userId && (
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel={`Manage ${item.username}'s connection`}
                                        disabled={mutation.isPending}
                                        hitSlop={8}
                                        style={{ paddingVertical: 10, minWidth: 28, alignItems: "center" }}
                                        onPress={() =>
                                            confirm({
                                                title: "Remove follower?",
                                                message: `${item.username} will stop following you. They can follow or request access again.`,
                                                label: "Remove",
                                                onConfirm: () => act(item.id, "remove"),
                                            })
                                        }
                                    >
                                        <MoreHorizontal size={20} color={colors.muted} />
                                    </Pressable>
                                )}
                            </View>
                            {kind === "requests" && (
                                <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
                                    <Button
                                        secondary
                                        label="Decline"
                                        disabled={mutation.isPending}
                                        onPress={() => act(item.id, "decline")}
                                    />
                                    <Button
                                        label="Accept request"
                                        disabled={mutation.isPending}
                                        onPress={() => act(item.id, "accept")}
                                    />
                                </View>
                            )}
                        </View>
                    )}
                />
            </View>
            <ConfirmationSheet confirmation={confirmation} dismiss={dismiss} />
        </Page>
    );
}
