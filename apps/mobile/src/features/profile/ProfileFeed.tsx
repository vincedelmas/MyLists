import {formatDate} from "@/lib/utils/formatting/date";
import {Avatar} from "../../components/avatar";
import {SectionHeading} from "../../components/section-heading";
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
import {formatActivityParts} from "./profile-formatting";
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
                    <SectionHeading title={title} action={title === "Recent feed" ? {
                        label: "View all Feed",
                        onPress: () => push({ pathname: "/profile/feed", params: { userId } }),
                    } : undefined}/>
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
        const payload = formatActivityParts(item, author?.ratingSystem ?? ratingSystem);
        return <View key={item.id} style={styles.row}>
            {author ? <Pressable accessibilityRole="button" accessibilityLabel={`View ${author.username}'s profile`} style={styles.author}
                                 onPress={() => push({ pathname: "/people/[userId]", params: { userId: String(author.userId) } })}>
                <Avatar image={author.avatar} name={author.username} size={50}/>
            </Pressable> : <View><Cover uri={item.cover} label={item.mediaName} style={styles.cover}/>{!item.cover &&
                <View style={styles.avatarFallback}><Icon size={20} color={mediaColors[item.mediaType]}/></View>}</View>}
            <Pressable accessibilityRole="button" style={styles.details}
                       onLongPress={onDelete ? () => onDelete(item.id) : undefined} accessibilityHint={onDelete ? "Long press to delete this update" : undefined}
                       accessibilityActions={onDelete ? [{ name: "delete", label: "Delete update" }] : undefined}
                       onAccessibilityAction={event => {
                           if (event.nativeEvent.actionName === "delete") onDelete?.(item.id);
                       }}
                       onPress={() => push({ pathname: "/media/[mediaType]/[mediaId]", params: { mediaType: item.mediaType, mediaId: String(item.mediaId) } })}>
                {author && <AppText numberOfLines={1} style={styles.username}>{author.username}</AppText>}
                <View style={styles.heading}><Icon size={12} color={mediaColors[item.mediaType]}/><AppText numberOfLines={2} style={styles.title}>{item.mediaName}</AppText></View>
                <AppText muted numberOfLines={2} style={styles.description}>{payload.prefix}{payload.before !== null && <>{payload.before}<AppText
                    style={[styles.description, { color: colors.accent }]}> → </AppText></>}<AppText style={[styles.description, { color: colors.text }]}>{payload.after}</AppText></AppText>
                <AppText muted style={styles.date}>{formatDate(item.timestamp)}</AppText>
            </Pressable>
        </View>;

    });
});

const styles = StyleSheet.create({
    author: { width: 60, minHeight: 60, alignItems: "center", justifyContent: "center" },
    cover: { width: 42, height: 63, borderRadius: 7 },
    avatarFallback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    username: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: colors.accent },
    row: {
        minHeight: 96,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    details: { flex: 1, minWidth: 0, minHeight: 72, justifyContent: "center", gap: 5 },
    heading: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },
    date: { fontSize: 11, lineHeight: 16 },
    description: { fontSize: 12, lineHeight: 18 },
    empty: { padding: 16, fontSize: 12, lineHeight: 18 },
});
