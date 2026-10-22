import { useCallback, useState } from "react";
import { Linking, FlatList, Pressable, RefreshControl, View } from "react-native";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, UsersRound, ExternalLink, X } from "lucide-react-native";
import { AppText, Button, Cover, Page, StateView } from "../../components/ui";
import { SectionTabs } from "../../components/section-tabs";
import { notificationsOptions } from "../../lib/react-query/query-options/notifications.options";
import { useNotificationAction } from "../../lib/react-query/query-mutations/notifications.mutations";
import { useSocialAction } from "../../lib/react-query/query-mutations/social.mutations";
import { useTabPush } from "../../hooks/use-tab-push";
import { mediaIcons, mediaLabels } from "../../lib/media";
import { backendUrl } from "../../lib/config";
import { colors } from "../../theme";

const messages = {
    follow: "started following you",
    followRequested: "requested to follow you",
    follow_accepted: "accepted your follow request",
    follow_declined: "declined your follow request",
    feature_request_created: "submitted a feature request",
    feature_request_updated: "updated your feature request",
};
export function NotificationsScreen() {
    const [type, setType] = useState<"media" | "social">("media");
    const focused = useIsFocused();
    const query = useQuery({ ...notificationsOptions(type), enabled: focused });
    const mutation = useNotificationAction();
    const { mutate: markRead } = mutation;
    const social = useSocialAction();
    const push = useTabPush();
    useFocusEffect(
        useCallback(
            () => () => {
                if (query.isSuccess) markRead({ action: "read", type });
            },
            [type, query.isSuccess, markRead],
        ),
    );
    return (
        <Page
            title="Notifications"
            brand
            back
            action={
                <Button
                    secondary
                    label="Mark read"
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ action: "read", type })}
                />
            }
        >
            <SectionTabs
                value={type}
                onChange={setType}
                tabs={[
                    { value: "media", label: "Media", icon: Bell },
                    { value: "social", label: "Social", icon: UsersRound },
                ]}
            />
            {(mutation.error || social.error) && (
                <AppText accessibilityRole="alert" style={{ padding: 16, color: colors.error }}>
                    {mutation.error?.message ?? social.error?.message}
                </AppText>
            )}
            <FlatList
                data={query.data ?? []}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                keyExtractor={(item) => `${item.kind}:${item.id}`}
                refreshControl={
                    <RefreshControl
                        tintColor={colors.accent}
                        refreshing={query.isRefetching}
                        onRefresh={() => void query.refetch()}
                    />
                }
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.isError ? "Couldn’t load notifications" : `No ${type} notifications`}
                        message={query.error?.message}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                }
                renderItem={({ item }) => {
                    const Icon = item.kind === "media" ? mediaIcons[item.mediaType] : UsersRound;
                    return (
                        <View
                            style={{
                                padding: 14,
                                gap: 12,
                                borderWidth: 1,
                                borderColor: item.read ? colors.border : colors.primary,
                                borderRadius: 14,
                                backgroundColor: colors.surface,
                            }}
                        >
                            <Pressable
                                accessibilityRole="button"
                                onPress={() =>
                                    item.kind === "media"
                                        ? push({
                                              pathname: "/media/[mediaType]/[mediaId]",
                                              params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                                          })
                                        : push({
                                              pathname: "/people/[userId]",
                                              params: { userId: String(item.actor.id) },
                                          })
                                }
                                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                            >
                                {item.kind === "social" ? (
                                    <Cover
                                        uri={item.actor.image}
                                        label={item.actor.name}
                                        style={{ width: 40, height: 40, borderRadius: 20 }}
                                    />
                                ) : (
                                    <Icon size={24} color={colors.accent} />
                                )}
                                <View style={{ flex: 1, gap: 5 }}>
                                    <AppText style={{ fontWeight: "600" }}>
                                        {item.kind === "media" ? item.name : item.actor.name}
                                    </AppText>
                                    <AppText muted style={{ fontSize: 12 }}>
                                        {item.kind === "media"
                                            ? `${mediaLabels[item.mediaType]}${item.season != null ? ` · S${item.season} E${item.episode}${item.isSeasonFinale ? " · Season finale" : ""}` : ""} · ${item.releaseDate ?? "Upcoming"}`
                                            : messages[item.type]}
                                    </AppText>
                                </View>
                                {!item.read && (
                                    <View
                                        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }}
                                    />
                                )}
                            </Pressable>
                            {item.kind === "social" &&
                                (item.type === "followRequested" ? (
                                    <View style={{ flexDirection: "row", gap: 12, justifyContent: "flex-end" }}>
                                        <Button
                                            secondary
                                            label="Decline"
                                            disabled={social.isPending}
                                            onPress={() =>
                                                social.mutate({ targetId: item.actor.id, action: "decline" })
                                            }
                                        />
                                        <Button
                                            label="Accept"
                                            disabled={social.isPending}
                                            onPress={() => social.mutate({ targetId: item.actor.id, action: "accept" })}
                                        />
                                    </View>
                                ) : (
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            gap: 12,
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        {item.featureRequest && (
                                            <Pressable
                                                accessibilityRole="link"
                                                onPress={() =>
                                                    void Linking.openURL(new URL("/features-vote", backendUrl).href)
                                                }
                                                style={{ flex: 1, flexDirection: "row", gap: 6, alignItems: "center" }}
                                            >
                                                <AppText style={{ color: colors.accent, fontSize: 12 }}>
                                                    {item.featureRequest.title}
                                                </AppText>
                                                <ExternalLink size={13} color={colors.accent} />
                                            </Pressable>
                                        )}
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel="Dismiss notification"
                                            disabled={mutation.isPending}
                                            onPress={() =>
                                                mutation.mutate({ action: "delete", notificationId: item.id })
                                            }
                                            style={{ padding: 8 }}
                                        >
                                            <X size={16} color={colors.muted} />
                                        </Pressable>
                                    </View>
                                ))}
                        </View>
                    );
                }}
            />
        </Page>
    );
}
