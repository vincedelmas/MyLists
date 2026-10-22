import { memo, type ReactNode } from "react";
import { CollapsingTabs } from "../../components/collapsing-tabs";
import { colors } from "../../theme";
import type { MobileProfile } from "../../lib/api-client";
import { PrivacyBadge } from "./PrivacyBadge";
import { ProfileFeed } from "./ProfileFeed";
import { ProfileContinue } from "./ProfileContinue";
import { formatCount } from "./profile-formatting";
import { useTabPush } from "../../hooks/use-tab-push";
import { useQueryClient } from "@tanstack/react-query";
import { MediaListGrid } from "../../components/media-list-grid";
import { Animated, RefreshControl, View } from "react-native";
import { UserRound, Activity, CalendarDays, ChartNoAxesCombined, Trophy } from "lucide-react-native";
import { Button as NativeButton } from "@expo/ui";
import { NativeHost } from "../../components/native-host";
import { useCollapsingScroll } from "../../hooks/use-collapsing-scroll";
import { AppText, Cover } from "../../components/ui";

const profileTabs = [
    { value: "profile", label: "Profile", icon: UserRound },
    { value: "activity", label: "Activity", icon: Activity },
    { value: "calendar", label: "Releases", icon: CalendarDays },
    { value: "stats", label: "Stats", icon: ChartNoAxesCombined },
    { value: "achievements", label: "Achievements", icon: Trophy },
] as const;

export function ProfileLayout({
    data,
    refreshing,
    userId,
    headerAction,
}: {
    data: MobileProfile;
    refreshing: boolean;
    userId?: number;
    headerAction?: ReactNode;
}) {
    const push = useTabPush();
    return (
        <CollapsingTabs
            tabs={profileTabs}
            initialTab="profile"
            onTabPress={(tab) => {
                if (tab === "profile") return;
                push({
                    pathname: `/profile/${tab === "calendar" ? "releases" : tab}`,
                    params: { userId, username: data.user.name },
                });
            }}
            header={<ProfileHeader data={data} userId={userId} action={headerAction} />}
        >
            {() => <ProfileContent data={data} refreshing={refreshing} userId={userId} />}
        </CollapsingTabs>
    );
}

// Focus changes update the query controller without rebuilding the profile.
const ProfileContent = memo(function ProfileContent({
    data,
    refreshing,
    userId,
}: {
    data: MobileProfile;
    refreshing: boolean;
    userId?: number;
}) {
    const client = useQueryClient();
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();

    return (
        <Animated.ScrollView
            {...scrollProps}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ padding: 16, gap: 24 }, contentContainerStyle]}
            refreshControl={
                <RefreshControl
                    colors={[colors.accent]}
                    tintColor={colors.accent}
                    refreshing={refreshing}
                    onRefresh={() => void client.invalidateQueries({ queryKey: ["profile"] })}
                />
            }
        >
            <View style={{ gap: 12 }}>
                <AppText heading style={{ fontSize: 17 }}>
                    Media lists
                </AppText>
                <MediaListGrid lists={data.lists} userId={userId} />
            </View>
            <ProfileContinue userId={userId} />
            <ProfileFeed userId={userId} ratingSystem={data.user.ratingSystem} />
        </Animated.ScrollView>
    );
});

export const ProfileHeader = memo(function ProfileHeader({
    data,
    userId,
    action,
}: {
    data: {
        user: Pick<
            MobileProfile["user"],
            "id" | "name" | "privacy" | "image" | "backgroundImage" | "createdAt" | "level"
        >;
        social?: MobileProfile["social"];
    };
    userId?: number;
    action?: ReactNode;
}) {
    const push = useTabPush();
    return (
        <View pointerEvents="box-none" style={{ gap: 0, paddingBottom: 12 }}>
            <Cover
                pointerEvents="none"
                uri={data.user.backgroundImage}
                style={{ width: "100%", height: 152, borderRadius: 0 }}
            />
            <View pointerEvents="box-none" style={{ paddingHorizontal: 16, gap: 14 }}>
                <View
                    pointerEvents="box-none"
                    style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", marginTop: -44 }}
                >
                    <Cover
                        pointerEvents="none"
                        uri={data.user.image}
                        label={data.user.name}
                        style={{
                            width: 112,
                            height: 112,
                            borderWidth: 4,
                            borderRadius: 56,
                            borderColor: colors.background,
                        }}
                    />
                    <View pointerEvents="box-none" style={{ flex: 1, gap: 5, paddingTop: 44, paddingBottom: 4 }}>
                        <View pointerEvents="box-none" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View pointerEvents="none" style={{ flex: 1, gap: 2 }}>
                                <AppText heading style={{ fontSize: 22, lineHeight: 28 }}>
                                    {data.user.name}
                                </AppText>
                                <AppText muted style={{ fontSize: 11, lineHeight: 16 }}>
                                    Joined in {new Date(data.user.createdAt).getUTCFullYear()} · Level {data.user.level}
                                </AppText>
                            </View>
                            <View style={{ paddingTop: 12 }}>
                                <PrivacyBadge value={data.user.privacy} />
                            </View>
                        </View>
                        {action}
                    </View>
                </View>
                {data.social && (
                    <View
                        pointerEvents="box-none"
                        style={{
                            gap: 12,
                            paddingBottom: 4,
                            flexDirection: "row",
                        }}
                    >
                        {(
                            [
                                ["following", data.social.followsCount],
                                ["followers", data.social.followersCount],
                            ] as const
                        ).map(([kind, count]) => (
                            <NativeHost key={kind} style={{ flex: 1 }}>
                                <NativeButton
                                    label={`${formatCount(count)} ${kind === "following" ? "Following" : "Followers"}`}
                                    variant="outlined"
                                    onPress={() => push({ pathname: "/profile/social", params: { kind, userId } })}
                                />
                            </NativeHost>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
});
