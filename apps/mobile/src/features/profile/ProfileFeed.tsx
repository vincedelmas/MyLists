import {memo} from "react";
import {useIsFocused} from "expo-router";
import {Pressable, StyleSheet, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import type {api, MobileProfile, MobileProfileActivity} from "../../lib/api-client";
import {colors} from "../../theme";
import {mediaIcons, mediaColors} from "../../lib/media";
import {useTabPush} from "../../hooks/use-tab-push";
import {AppText, Cover, QueryPanel} from "../../components/ui";
import {formatActivity} from "./profile-formatting";
import {profileActivityOptions, profileFollowsFeedOptions} from "../../lib/react-query/query-options/profile.options";

type FeedItem = MobileProfileActivity[number] | Awaited<ReturnType<typeof api.profileExtras>>["followsFeed"][number];
type RatingSystem = MobileProfile["user"]["ratingSystem"];

export function ProfileFeed({ ratingSystem, userId }: { ratingSystem: RatingSystem; userId?: number }) {
    const focused = useIsFocused();
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
                    <View style={styles.card}>
                        <QueryPanel<readonly FeedItem[]> query={query}>
                            {(items) =>
                                items.length ? (
                                    <FeedRows items={items} ratingSystem={ratingSystem}/>
                                ) : (
                                    <AppText muted style={styles.empty}>
                                        {empty}
                                    </AppText>
                                )
                            }
                        </QueryPanel>
                    </View>
                </View>
            ))}
        </>
    );
}

const FeedRows = memo(function FeedRows({
                                            items,
                                            ratingSystem,
                                        }: {
    items: readonly FeedItem[];
    ratingSystem: RatingSystem;
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
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: "hidden",
    },
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
