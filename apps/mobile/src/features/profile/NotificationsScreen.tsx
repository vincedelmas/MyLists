import {formatCalendarRelativeLabel} from "../../lib/calendar-formatting";
import {memo, useCallback, useEffect, useRef, useState} from "react";
import {FlatList, Linking, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Bell, CheckCheck, ExternalLink, UsersRound, X} from "lucide-react-native";
import {formatDate} from "@/lib/utils/formatting/date";
import {zeroPad} from "@/lib/utils/formatting/number";
import type {api} from "../../lib/api-client";
import {AppText, Page, StateView} from "../../components/ui";
import {Avatar} from "../../components/avatar";
import {PagedTabs} from "../../components/paged-tabs";
import {notificationsOptions, notificationCountsOptions} from "../../lib/react-query/query-options/notifications.options";
import {useNotificationAction} from "../../lib/react-query/query-mutations/notifications.mutations";
import {useSocialAction} from "../../lib/react-query/query-mutations/social.mutations";
import {useTabPush} from "../../hooks/use-tab-push";
import {mediaIcons, mediaColors} from "../../lib/media";
import {backendUrl} from "../../lib/config";
import {FollowRequestActions} from "./follow-request-actions";
import {colors} from "../../theme";


type SocialAction = Parameters<typeof api.socialAction>[0]["action"];


type Notification = Awaited<ReturnType<typeof api.notifications>>[number];


const messages = {
    follow: "started following you",
    followRequested: "requested to follow you",
    follow_accepted: "accepted your follow request",
    follow_declined: "declined your follow request",
    feature_request_created: "submitted a feature request",
    feature_request_updated: "updated your feature request",
};


const notificationTabs = [
    { value: "media", label: "Media", icon: Bell },
    { value: "social", label: "Social", icon: UsersRound },
] as const;


export function NotificationsScreen() {
    const focused = useIsFocused();
    const mutation = useNotificationAction();
    const [type, setType] = useState<"media" | "social">("media");
    const counts = useQuery({ ...notificationCountsOptions, enabled: focused });

    const unread = counts.data?.[type] ?? 0;

    return (
        <Page
            back={true}
            brand={true}
            title="Notifications"
            action={
                <Pressable
                    accessibilityRole="button"
                    disabled={mutation.isPending || !unread}
                    accessibilityLabel="Mark all notifications in this tab as read"
                    onPress={() => mutation.mutate({ action: "read", type })}
                    accessibilityState={{ disabled: mutation.isPending || !unread }}
                    style={({ pressed }) => [
                        styles.iconButton,
                        !unread && styles.disabled,
                        pressed && styles.pressed,
                    ]}
                >
                    <CheckCheck size={23} color={colors.accent}/>
                </Pressable>
            }
        >
            {mutation.error &&
                <AppText accessibilityRole="alert" style={styles.error}>
                    {mutation.error.message}
                </AppText>
            }
            <PagedTabs
                value={type}
                onChange={setType}
                tabs={notificationTabs.map(tab => ({ ...tab, count: counts.data?.[tab.value] }))}
            >
                {value =>
                    <NotificationContent
                        type={value}
                        active={type === value}
                    />
                }
            </PagedTabs>
        </Page>
    );
}


function NotificationContent({ type, active }: { type: "media" | "social"; active: boolean }) {
    const push = useTabPush();
    const focused = useIsFocused();
    const social = useSocialAction();
    const { mutate: respond } = social;
    const unread = useRef(false);
    const mutation = useNotificationAction();

    const { mutate: markRead } = mutation;
    const query = useQuery({ ...notificationsOptions(type), enabled: focused && active });

    useEffect(() => {
        unread.current = query.data?.some(item => !item.read) ?? false;
    }, [query.data]);
    useEffect(() => {
        if (!focused || !active || !query.isSuccess) return;

        return () => {
            if (unread.current) markRead({ action: "read", type });
        };
    }, [focused, active, type, query.isSuccess, markRead]);

    const open = useCallback((item: Notification) => item.kind === "media"
        ? push({
            pathname: "/media/[mediaType]/[mediaId]",
            params: { mediaType: item.mediaType, mediaId: String(item.mediaId) }
        })
        : push({
            pathname: "/people/[userId]",
            params: { userId: String(item.actor.id) }
        }), [push]);
    const dismiss = useCallback((id: number) => markRead({ action: "delete", notificationId: id }), [markRead]);
    const respondRequest = useCallback((id: number, action: "accept" | "decline") => respond({ targetId: id, action }), [respond]);

    const renderItem = useCallback(({ item }: { item: Notification }) =>
        <NotificationRow
            item={item}
            onOpen={open}
            onDismiss={dismiss}
            onRespond={respondRequest}
            disabled={mutation.isPending || social.isPending}
            pendingAction={item.kind === "social" && social.isPending && social.variables?.targetId === item.actor.id
                ? social.variables.action
                : undefined}
        />, [open, dismiss, respondRequest, mutation.isPending, social.isPending, social.variables]);

    const Icon = type === "media" ? Bell : UsersRound;

    return (
        <>
            {(mutation.error || social.error) &&
                <AppText accessibilityRole="alert" style={styles.error}>
                    {mutation.error?.message ?? social.error?.message}
                </AppText>
            }
            <FlatList
                windowSize={7}
                initialNumToRender={7}
                data={query.data ?? []}
                renderItem={renderItem}
                maxToRenderPerBatch={7}
                contentContainerStyle={styles.content}
                keyExtractor={item => `${item.kind}:${item.id}`}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={query.isRefetching}
                        onRefresh={() => void query.refetch()}
                    />
                }
                ListEmptyComponent={query.isPending
                    ? <StateView loading/>
                    : query.error
                        ?
                        <StateView
                            title="Couldn’t load notifications"
                            message={query.error.message}
                            retry={() => void query.refetch()}
                        />
                        :
                        <View style={styles.empty}>
                            <View style={styles.emptyIcon}>
                                <Icon size={28} color={colors.accent}/>
                            </View>
                            <AppText heading style={styles.emptyTitle}>
                                You’re all
                                caught up
                            </AppText>
                            <AppText muted style={styles.emptyMessage}>
                                {type === "media"
                                    ? "New releases from your tracked media will appear here."
                                    : "Follow requests and community updates will appear here."}
                            </AppText>
                        </View>
                }
                ListFooterComponent={query.error && query.data?.length
                    ? <StateView
                        title="Couldn’t refresh notifications"
                        retry={() => void query.refetch()}
                    />
                    : undefined
                }
            />
        </>
    );
}


const NotificationRow = memo(function NotificationRow({ item, onOpen, onDismiss, onRespond, disabled, pendingAction }: {
    item: Notification;
    onOpen: (item: Notification) => void;
    onDismiss: (id: number) => void;
    onRespond: (id: number, action: "accept" | "decline") => void;
    disabled: boolean;
    pendingAction?: SocialAction;
}) {
    const Icon = item.kind === "media" ? mediaIcons[item.mediaType] : UsersRound;
    const color = item.kind === "media" ? mediaColors[item.mediaType] : colors.accent;
    const relative = item.kind === "media" && item.releaseDate ? formatCalendarRelativeLabel(item.releaseDate) : null;

    return (
        <View style={[styles.row, !item.read && styles.unread]}>
            <View style={styles.rowHeading}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.kind === "media" ? item.name : item.actor.name}${item.read ? "" : ", unread notification"}`}
                    onPress={() => onOpen(item)}
                    style={({ pressed }) => [styles.notification, pressed && styles.pressed]}
                >
                    {item.kind === "social"
                        ? <Avatar
                            image={item.actor.image}
                            name={item.actor.name}
                            size={48}
                        />
                        :
                        <View style={styles.mediaIcon}>
                            <Icon size={16} color={color}/>
                        </View>
                    }
                    <View style={styles.identity}>
                        <View style={styles.titleRow}>
                            <AppText numberOfLines={2} style={styles.title}>
                                {item.kind === "media" ? item.name : item.actor.name}
                            </AppText>
                            {!item.read &&
                                <View accessibilityLabel="Unread" style={styles.unreadDot}/>
                            }
                        </View>
                        {item.kind === "media"
                            ? <View style={styles.releaseDetails}>
                                <AppText style={styles.releaseSummary}>
                                    {item.season != null
                                        ? `S${zeroPad(item.season)}.E${zeroPad(item.episode)}${item.isSeasonFinale ? " (Finale)" : ""}`
                                        : "Release"}
                                    <AppText
                                        style={{ color: colors.accent }}
                                    > → </AppText>
                                    {item.releaseDate ? formatDate(item.releaseDate) : "Upcoming"}
                                </AppText>
                                {relative &&
                                    <AppText muted style={styles.relativeDate}>
                                        {relative}
                                    </AppText>
                                }
                            </View>
                            : <>
                                <AppText muted style={styles.caption}>
                                    {messages[item.type]}
                                </AppText>
                                <AppText muted style={styles.date}>
                                    {formatDate(item.createdAt)}
                                </AppText>
                            </>
                        }
                    </View>
                </Pressable>
                {item.kind === "social" && item.type !== "followRequested" &&
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss notification"
                        disabled={disabled}
                        onPress={() => onDismiss(item.id)}
                        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                        <X size={18} color={colors.muted}/>
                    </Pressable>
                }
            </View>
            {item.kind === "social" && (item.type === "followRequested"
                ?
                <FollowRequestActions
                    disabled={disabled}
                    pendingAction={pendingAction}
                    onAccept={() => onRespond(item.actor.id, "accept")}
                    onDecline={() => onRespond(item.actor.id, "decline")}
                />
                :
                item.featureRequest &&
                <Pressable
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(new URL("/features-vote", backendUrl).href)}
                    style={({ pressed }) => [styles.featureLink, pressed && styles.pressed]}
                >
                    <AppText style={styles.featureTitle}>
                        {item.featureRequest.title}
                    </AppText>
                    <ExternalLink size={14} color={colors.accent}/>
                </Pressable>)
            }
        </View>
    );
});


const styles = StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 28, gap: 8 },
    listHeading: { paddingTop: 16, paddingBottom: 8 },
    row: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        gap: 14,
        borderRadius: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    unread: { backgroundColor: `${colors.accent}08` },
    rowHeading: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
    notification: {
        flex: 1,
        minWidth: 0,
        minHeight: 64,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12
    },
    mediaIcon: {
        width: 20,
        height: 24,
        alignItems: "center",
        justifyContent: "center"
    },
    releaseDetails: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12
    },
    releaseSummary: {
        flexShrink: 1,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "600",
        color: colors.text,
        fontVariant: ["tabular-nums"]
    },
    relativeDate: { fontSize: 11, lineHeight: 18, flexShrink: 0 },
    identity: { flex: 1, minWidth: 0, gap: 6 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: {
        flex: 1,
        fontSize: 15,
        lineHeight: 21,
        fontWeight: "600"
    },
    unreadDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.accent
    },
    caption: { fontSize: 12, lineHeight: 18 },
    date: { fontSize: 11, lineHeight: 16 },
    iconButton: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center"
    },
    featureLink: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.surface,
        borderRadius: 10
    },
    featureTitle: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: colors.accent
    },
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
    emptyMessage: { fontSize: 14, lineHeight: 22, textAlign: "center" },
    error: {
        padding: 16,
        color: colors.error,
        fontSize: 12,
        lineHeight: 18
    },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.6 },
});
