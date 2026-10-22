import {memo} from "react";
import {colors} from "../../theme";
import type {api} from "../../lib/api-client";
import {useIsFocused} from "expo-router";
import {Pressable, View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {AchievementRow} from "./AchievementRow";
import {useTabPush} from "../../hooks/use-tab-push";
import {formatActivity} from "./profile-formatting";
import {mediaIcons, mediaColors} from "../../lib/media";
import {AppText, Button, QueryPanel, Section} from "../../components/ui";
import {profileExtrasOptions} from "../../lib/react-query/query-options/profile.options";


export function ProfileExtras({ ratingSystem }: { ratingSystem: "score" | "feeling" }) {
    const focused = useIsFocused();
    const query = useQuery({ ...profileExtrasOptions, enabled: focused });

    return (
        <QueryPanel query={query}>
            {(data) => (
                <ProfileExtrasContent data={data} ratingSystem={ratingSystem}/>
            )}
        </QueryPanel>
    );
}


const ProfileExtrasContent = memo(function ProfileExtrasContent({ data, ratingSystem }: {
    data: Awaited<ReturnType<typeof api.profileExtras>>;
    ratingSystem: "score" | "feeling";
}) {
    const push = useTabPush();

    return (
        <View style={{ gap: 28 }}>
            <Section
                title="Latest achievements"
                action={
                    <Pressable
                        hitSlop={10}
                        accessibilityRole="link"
                        onPress={() => push("/profile/achievements")}
                    >
                        <AppText style={{ color: colors.accent, fontSize: 13 }}>
                            View all
                        </AppText>
                    </Pressable>
                }
            >
                {data.achievements.length ?
                    data.achievements.map((item) => (
                        <AchievementRow
                            name={item.name}
                            description={item.description}
                            key={`${item.id}:${item.difficulty}`}
                            detail={`${item.difficulty} · ${new Date(item.completedAt!).toLocaleDateString()}`}
                        />
                    ))
                    :
                    <AppText muted style={{ padding: 16 }}>
                        Your next milestone starts with a little progress.
                    </AppText>
                }
            </Section>
            <Section title="Follows feed">
                {data.followsFeed.length ?
                    data.followsFeed.map((item) => {
                        const Icon = mediaIcons[item.mediaType];

                        return (
                            <Pressable
                                key={item.id}
                                accessibilityRole="button"
                                onPress={() =>
                                    push({
                                        pathname: "/media/[mediaType]/[mediaId]",
                                        params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                                    })
                                }
                                style={({ pressed }) => ({
                                    gap: 6,
                                    padding: 16,
                                    borderBottomWidth: 1,
                                    opacity: pressed ? 0.6 : 1,
                                    borderBottomColor: colors.border,
                                })}
                            >
                                <AppText muted={true} style={{ fontSize: 12 }}>
                                    {item.username} · {new Date(item.timestamp).toLocaleDateString()}
                                </AppText>
                                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                                    <Icon size={18} color={mediaColors[item.mediaType]}/>
                                    <AppText style={{ flex: 1, fontWeight: "600" }}>
                                        {item.mediaName}
                                    </AppText>
                                </View>
                                <AppText muted={true}>
                                    {formatActivity(item, ratingSystem)}
                                </AppText>
                            </Pressable>
                        );
                    })
                    :
                    <View style={{ padding: 16, gap: 12 }}>
                        <AppText muted={true}>
                            Updates from people you follow will appear here.
                        </AppText>
                        <Button
                            secondary={true}
                            label="See following"
                            onPress={() => push({ pathname: "/profile/social", params: { kind: "following" } })}
                        />
                    </View>
                }
            </Section>
        </View>
    );
});
