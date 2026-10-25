import {memo} from "react";
import {useIsFocused} from "expo-router";
import {Pressable, StyleSheet, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import type {api, MobileProfile, MobileProfileActivity} from "../../lib/api-client";
import {colors} from "../../theme";
import {mediaIcons, mediaColors} from "../../lib/media";
import {useTabPush} from "../../hooks/use-tab-push";
import {AppText, Cover, QueryPanel, Card} from "../../components/ui";
import {ConfirmationSheet} from "../../components/confirmation-sheet";
import {useFeedDeletion} from "./use-feed-deletion";
import {formatActivity} from "./profile-formatting";
import {profileActivityOptions, profileFollowsFeedOptions} from "../../lib/react-query/query-options/profile.options";

type FeedItem = MobileProfileActivity[number] | Awaited<ReturnType<typeof api.profileExtras>>["followsFeed"][number];
type RatingSystem = MobileProfile["user"]["ratingSystem"];

export function ProfileFeed({ ratingSystem, userId }: { ratingSystem: RatingSystem; userId?: number }) {
    const focused = useIsFocused();
    const push = useTabPush();
    const { deleteUpdate, confirmationProps } = useFeedDeletion();
    const mine = useQuery({ ...profileActivityOptions(userId), enabled: focused });
    const following = useQuery({ ...profileFollowsFeedOptions(userId), enabled: focused });
    return (
        <>
            {(
                [
                    { title: "Recent feed", query: mine, empty: "Tracking updates will appear here." },
                    { title: "Follows feed", query: following, empty: "Updates from followed users will appear here." },
                ] as const
            ).map(({ title, query, empty }) => (
                <View key={title} style={{ gap: 12 }}>
                    <AppText heading style={{ fontSize: 17 }}>
                        {title}
                    </AppText>
                    <Card>
                        <QueryPanel<readonly FeedItem[]> query={query}>
                            {(items) =>
                                items.length ? (
                                    <FeedRows items={items} ratingSystem={ratingSystem} onDelete={title === "Recent feed" && !userId ? deleteUpdate : undefined}/>
                                ) : (
                                    <AppText muted style={styles.empty}>
                                        {empty}
                                    </AppText>
                                )
                            }
                        </QueryPanel>
                    </Card>
                    {title === "Recent feed" && (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => push({ pathname: "/profile/feed", params: { userId } })}
                            style={({ pressed }) => ({
                                paddingVertical: 10,
                                alignItems: "center",
                                borderWidth: 1,
                                borderStyle: "dashed",
                                borderColor: colors.border,
                                borderRadius: 8,
                                opacity: pressed ? 0.6 : 1
                            })}
                        >
                            <AppText style={{ color: colors.accent, fontSize: 12 }}>View all Feed</AppText>
                        </Pressable>
                    )}
                </View>
            ))}
            <ConfirmationSheet {...confirmationProps}/>
        </>
    );
}

export const FeedRows = memo(function FeedRows({
                                                   items,
                                                   ratingSystem,
                                                   onDelete,
                                               }: {
    items: readonly FeedItem[];
    ratingSystem: RatingSystem;
    onDelete?: (id: number) => void;
}) {
    const push = useTabPush();
    return items.map((item) => {
        const Icon = mediaIcons[item.mediaType];
        const author = "avatar" in item ? item : null;
        return (
            <View key={item.id} style={styles.row}>
                {author ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${author.username}'s profile`}
                        style={styles.author}
                        onPress={() =>
                            push({ pathname: "/people/[userId]", params: { userId: String(author.userId) } })
                        }
                    >
                        <Cover
                            uri={author.avatar}
                            label={author.username}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                        />
                        <AppText numberOfLines={2} style={styles.username}>
                            {author.username}
                        </AppText>
                    </Pressable>
                ) : (
                    <Icon size={16} color={mediaColors[item.mediaType]}/>
                )}
                <Pressable
                    accessibilityRole="button"
                    style={styles.details}
                    onLongPress={onDelete ? () => onDelete(item.id) : undefined}
                    accessibilityHint={onDelete ? "Long press to delete this update" : undefined}
                    accessibilityActions={onDelete ? [{ name: "delete", label: "Delete update" }] : undefined}
                    onAccessibilityAction={(event) => {
                        if (event.nativeEvent.actionName === "delete") onDelete?.(item.id);
                    }}
                    onPress={() =>
                        push({
                            pathname: "/media/[mediaType]/[mediaId]",
                            params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                        })
                    }
                >
                    <View style={styles.heading}>
                        {author && <Icon size={13} color={mediaColors[item.mediaType]}/>}
                        <AppText numberOfLines={1} style={styles.title}>
                            {item.mediaName}
                        </AppText>
                        <AppText muted style={styles.date}>
                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </AppText>
                    </View>
                    <AppText muted style={styles.description}>
                        {formatActivity(item, author?.ratingSystem ?? ratingSystem)}
                    </AppText>
                </Pressable>
            </View>
        );
    });
});

const styles = StyleSheet.create({
    author: { width: 68, alignItems: "center", gap: 4 },
    username: { fontSize: 10, fontWeight: "600", color: colors.accent, textAlign: "center" },
    row: {
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    details: { flex: 1, gap: 2 },
    heading: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    title: { flex: 1, fontSize: 13, fontWeight: "600" },
    date: { fontSize: 10 },
    description: { fontSize: 12 },
    empty: { padding: 16, fontSize: 12 },
});
