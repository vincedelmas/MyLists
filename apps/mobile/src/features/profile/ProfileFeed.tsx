import { memo, useState } from "react";
import { useIsFocused } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { api, MobileProfile, MobileProfileActivity } from "../../lib/api-client";
import { colors } from "../../theme";
import { mediaIcons, mediaColors } from "../../lib/media";
import { useTabPush } from "../../hooks/use-tab-push";
import { TopTabs } from "../../components/top-tabs";
import { AppText, Cover, QueryPanel } from "../../components/ui";
import { formatActivity } from "./profile-formatting";
import { profileActivityOptions, profileFollowsFeedOptions } from "../../lib/react-query/query-options/profile.options";

type FeedItem = MobileProfileActivity[number] | Awaited<ReturnType<typeof api.profileExtras>>["followsFeed"][number];
type RatingSystem = MobileProfile["user"]["ratingSystem"];
const tabs = [
    { value: "mine", label: "Recent feed" },
    { value: "following", label: "Follows feed" },
] as const;

export function ProfileFeed({ ratingSystem }: { ratingSystem: RatingSystem }) {
    const focused = useIsFocused();
    const [tab, setTab] = useState<(typeof tabs)[number]["value"]>("mine");
    const mine = useQuery({ ...profileActivityOptions, enabled: focused && tab === "mine" });
    const following = useQuery({ ...profileFollowsFeedOptions, enabled: focused && tab === "following" });
    const query = tab === "mine" ? mine : following;

    return (
        <View style={styles.card}>
            <TopTabs value={tab} tabs={tabs} onChange={setTab} />
            <QueryPanel<readonly FeedItem[]> query={query}>
                {(items) =>
                    items.length ? (
                        <FeedRows items={items} ratingSystem={ratingSystem} />
                    ) : (
                        <AppText muted style={styles.empty}>
                            {tab === "mine"
                                ? "Your tracking updates will appear here."
                                : "Updates from people you follow will appear here."}
                        </AppText>
                    )
                }
            </QueryPanel>
        </View>
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
    return items.slice(0, 10).map((item) => {
        const Icon = mediaIcons[item.mediaType];
        const author = "avatar" in item ? item : null;
        return (
            <View key={item.id} style={styles.row}>
                {author ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`View ${author.username}'s profile`}
                        onPress={() =>
                            push({ pathname: "/people/[userId]", params: { userId: String(author.userId) } })
                        }
                    >
                        <Cover
                            uri={author.avatar}
                            label={author.username}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                        />
                    </Pressable>
                ) : (
                    <Icon size={16} color={mediaColors[item.mediaType]} />
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
                        {author && <Icon size={13} color={mediaColors[item.mediaType]} />}
                        <AppText numberOfLines={1} style={styles.title}>
                            {item.mediaName}
                        </AppText>
                        <AppText muted style={styles.date}>
                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </AppText>
                    </View>
                    <AppText muted style={styles.description}>
                        {author ? `${author.username} · ` : ""}
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
    row: {
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
