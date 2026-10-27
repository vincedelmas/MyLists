import {MenuView} from "@expo/ui/community/menu";
import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {useIsFocused, useLocalSearchParams} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {Check, ChevronDown, Clock3, MoreHorizontal, Send, UserRoundCheck, UserRoundPlus, UsersRound, type LucideIcon} from "lucide-react-native";
import {useTabPush} from "../../hooks/use-tab-push";
import {useConfirmation} from "../../hooks/use-confirmation";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {PagedTabs} from "../../components/paged-tabs";
import {Avatar} from "../../components/avatar";
import {AppText, Page, StateView} from "../../components/ui";
import {recordNavigationTiming} from "../../lib/diagnostics/navigation-timing";
import {socialOptions} from "../../lib/react-query/query-options/social.options";
import {useSocialAction} from "../../lib/react-query/query-mutations/social.mutations";
import type {api} from "../../lib/api-client";
import {FollowRequestActions} from "./follow-request-actions";
import {colors} from "../../theme";


type Kind = Parameters<typeof api.social>[0]["kind"];


type Connection = Awaited<ReturnType<typeof api.social>>["items"][number];


type Action = Parameters<typeof api.socialAction>[0]["action"];


const kinds: { value: Kind; label: string; icon: LucideIcon; description: string }[] = [
    {
        value: "followers",
        label: "Followers",
        icon: UsersRound,
        description: "People following this profile"
    },
    {
        value: "following",
        label: "Following",
        icon: UserRoundCheck,
        description: "People this profile follows"
    },
    {
        value: "requests",
        label: "Requests",
        icon: UserRoundPlus,
        description: "Choose who can follow your private profile"
    },
    {
        value: "pending",
        label: "Sent",
        icon: Send,
        description: "Follow requests awaiting a response"
    },
];


export function SocialScreen() {
    const focused = useIsFocused();
    const params = useLocalSearchParams<{ kind?: Kind; userId?: string }>();
    const userId = params.userId ? Number(params.userId) : undefined;
    const [kind, setKind] = useState<Kind>(userId && params.kind !== "following" ? "followers" : params.kind ?? "followers");
    const tabs = useMemo(() => userId ? kinds.filter(item => item.value === "followers" || item.value === "following") : kinds, [userId]);
    const counts = useInfiniteQuery({ ...socialOptions(kind, userId), enabled: focused });
    useEffect(() => {
        if (counts.isSuccess) recordNavigationTiming("data-ready", "/profile/social");
        else if (counts.isError) recordNavigationTiming("data-error", "/profile/social");
    }, [counts.isSuccess, counts.isError, counts.dataUpdatedAt]);

    return (
        <Page
            title="Connections"
            brand
            back
        >
            <PagedTabs
                value={kind}
                onChange={setKind}
                tabs={tabs.map(tab => ({ ...tab, count: counts.data?.pages[0]?.counts[tab.value] }))}
            >
                {value =>
                    <ConnectionsContent
                        kind={value}
                        userId={userId}
                        active={kind === value}
                    />
                }
            </PagedTabs>
        </Page>
    );
}


function ConnectionsContent({ kind, userId, active }: { kind: Kind; userId?: number; active: boolean }) {
    const focused = useIsFocused();
    const mutation = useSocialAction();
    const { mutate } = mutation;
    const { confirmation, confirm, dismiss } = useConfirmation();
    const query = useInfiniteQuery({ ...socialOptions(kind, userId), enabled: focused && active });
    const items = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data]);
    const act = useCallback((item: Connection, action: Action) => {
        if (action === "remove" || (action === "unfollow" && item.myFollowStatus === "accepted")) {
            const remove = action === "remove";
            confirm({
                title: remove ? "Remove follower?" : "Unfollow this person?",
                message: remove
                    ? `${item.username} will stop following you. They can follow or request access again.`
                    : `Stop seeing ${item.username} in your follows feed?`,
                label: remove ? "Remove" : "Unfollow",
                onConfirm: () => mutate({ targetId: item.id, action })
            });
        }
        else mutate({ targetId: item.id, action });
    }, [confirm, mutate]);
    const renderItem = useCallback(({ item }: { item: Connection }) =>
            <ConnectionRow
                item={item}
                kind={kind}
                owner={!userId}
                disabled={mutation.isPending}
                pendingAction={mutation.isPending && mutation.variables?.targetId === item.id ? mutation.variables.action : undefined}
                onAction={act}
            />,
        [kind, userId, mutation.isPending, mutation.variables, act]);
    const category = kinds.find(item => item.value === kind)!;
    const Icon = category.icon;

    return (
        <>
            {mutation.error &&
                <AppText accessibilityRole="alert" style={styles.error}>
                    {mutation.error.message}
                </AppText>
            }
            <FlatList
                data={items}
                keyExtractor={item => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.content}
                initialNumToRender={7}
                maxToRenderPerBatch={7}
                windowSize={7}
                onEndReachedThreshold={0.5}
                onEndReached={() => {
                    if (focused && active && query.hasNextPage && !query.isFetching && !query.isError) void query.fetchNextPage();
                }}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={query.isRefetching && !query.isFetchingNextPage}
                        onRefresh={() => void query.refetch()}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.intro}>
                        <AppText muted style={styles.caption}>
                            {category.description}
                        </AppText>
                    </View>
                }
                ListEmptyComponent={query.isPending
                    ? <StateView loading/>
                    : query.error
                        ?
                        <StateView
                            title="Couldn’t load connections"
                            message={query.error.message}
                            retry={() => void query.refetch()}
                        />
                        :
                        <View style={styles.empty}>
                            <View style={styles.emptyIcon}>
                                <Icon size={29} color={colors.accent}/>
                            </View>
                            <AppText heading style={styles.emptyTitle}>
                                {kind === "requests" ? "No follow requests" : kind === "pending" ? "No pending requests" : `No ${kind} yet`}
                            </AppText>
                            <AppText muted style={styles.emptyMessage}>
                                {kind === "requests"
                                    ? "New requests will appear here for you to review."
                                    : kind === "pending"
                                        ? "Requests you send to private profiles will appear here."
                                        : "Connections will appear here as your community grows."}
                            </AppText>
                        </View>
                }
                ListFooterComponent={query.isFetchingNextPage
                    ? <StateView loading/>
                    : query.error && items.length
                        ?
                        <StateView
                            title="Couldn’t refresh connections"
                            retry={() => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}
                        />
                        : undefined
                }
            />
            <ConfirmationSheet confirmation={confirmation} dismiss={dismiss}/>
        </>
    );
}


const ConnectionRow = memo(function ConnectionRow({ item, kind, owner, disabled, pendingAction, onAction }: {
    item: Connection; kind: Kind; owner: boolean; disabled: boolean; pendingAction?: Action; onAction: (item: Connection, action: Action) => void;
}) {
    const push = useTabPush();
    const manage = kind === "followers" && owner && !item.isOwn;
    const follow = !item.isOwn && kind !== "requests";
    const relationship = item.isOwn
        ? "You"
        : item.myFollowStatus === "requested"
            ? "Request pending"
            : item.myFollowStatus === "accepted" ? "Following" : item.privacy === "private" ? "Private profile" : "Public profile";
    const status = item.myFollowStatus;
    const menuActions = [
        ...(status
            ? [
                {
                    id: "unfollow",
                    title: status === "accepted" ? "Unfollow" : "Cancel request",
                    attributes: { destructive: true, disabled }
                }
            ]
            : []),
        ...(manage
            ? [
                {
                    id: "remove",
                    title: "Remove follower",
                    attributes: { destructive: true, disabled }
                }
            ]
            : []),
    ];

    return (
        <View style={styles.row}>
            <View style={styles.rowHeading}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.username}'s profile`}
                    onPress={() => push({
                        pathname: "/people/[userId]",
                        params: { userId: String(item.id) }
                    })}
                    style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
                >
                    <Avatar
                        image={item.image}
                        name={item.username}
                        size={48}
                    />
                    <View style={styles.identity}>
                        <AppText numberOfLines={2} style={styles.name}>
                            {item.username}
                        </AppText>
                        <AppText muted style={styles.caption}>
                            {kind === "requests" ? "Wants to follow you" : relationship}
                        </AppText>
                    </View>
                </Pressable>
                {follow && !status &&
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Follow ${item.username}`}
                        disabled={disabled}
                        onPress={() => onAction(item, "follow")}
                        style={({ pressed }) => [styles.followButton, disabled && styles.disabled, pressed && styles.pressed]}
                    >
                        {pendingAction === "follow"
                            ? <ActivityIndicator size="small" color={colors.accentText}/>
                            :
                            <AppText style={styles.followLabel}>
                                {kind === "followers" && owner ? "Follow back" : "Follow"}
                            </AppText>
                        }
                    </Pressable>
                }
                {menuActions.length > 0 && kind !== "requests" &&
                    <MenuView
                        colorScheme="dark"
                        actions={menuActions}
                        onPressAction={({ nativeEvent }) => onAction(item, nativeEvent.event as Action)}
                    >
                        <View
                            accessible
                            accessibilityRole="button"
                            accessibilityLabel={`Manage connection with ${item.username}`}
                            style={[status ? styles.relationshipButton : styles.more, disabled && styles.disabled]}
                        >
                            {pendingAction
                                ? <ActivityIndicator size="small" color={colors.accent}/>
                                : status
                                    ? <>
                                        {status === "accepted"
                                            ? <Check size={17} color={colors.accent}/>
                                            :
                                            <Clock3 size={17} color={colors.muted}/>
                                        }
                                        <ChevronDown size={13} color={colors.muted}/>
                                    </>
                                    : <MoreHorizontal size={21} color={colors.muted}/>
                            }
                        </View>
                    </MenuView>
                }
            </View>
            {kind === "requests" &&
                <View style={styles.requestActions}>
                    <FollowRequestActions
                        disabled={disabled}
                        pendingAction={pendingAction}
                        onAccept={() => onAction(item, "accept")}
                        onDecline={() => onAction(item, "decline")}
                    />
                </View>
            }
        </View>
    );
});


const styles = StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 28 },
    intro: { paddingTop: 20, paddingBottom: 8 },
    caption: { fontSize: 12, lineHeight: 18 },
    row: {
        paddingVertical: 18,
        gap: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    rowHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
    profile: {
        flex: 1,
        minWidth: 0,
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    identity: { flex: 1, minWidth: 0, gap: 4 },
    name: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
    more: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center"
    },
    followButton: {
        minHeight: 48,
        minWidth: 84,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 24,
        backgroundColor: colors.primary
    },
    followLabel: { fontSize: 12, fontWeight: "600", color: colors.accentText },
    relationshipButton: {
        minWidth: 64,
        height: 48,
        paddingHorizontal: 12,
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border
    },
    requestActions: { paddingLeft: 60 },
    disabled: { opacity: 0.4 },
    empty: {
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
        gap: 12
    },
    emptyIcon: {
        width: 68,
        height: 68,
        borderRadius: 22,
        backgroundColor: `${colors.accent}10`,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4
    },
    emptyTitle: { fontSize: 20, lineHeight: 28, textAlign: "center" },
    emptyMessage: {
        fontSize: 14,
        lineHeight: 22,
        color: colors.muted,
        textAlign: "center"
    },
    error: {
        padding: 16,
        color: colors.error,
        fontSize: 12,
        lineHeight: 18
    },
    pressed: { opacity: 0.6 },
});
