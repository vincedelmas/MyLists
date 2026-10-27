import {memo, type ReactNode} from "react";
import {CollapsingTabs} from "../../components/collapsing-tabs";
import {colors} from "../../theme";
import type {MobileProfile} from "../../lib/api-client";
import {PrivacyBadge} from "./PrivacyBadge";
import {ProfileOverview} from "./ProfileOverview";
import {ProfilePinnedLists} from "./ProfilePinnedLists";
import {ProfileFeed} from "./ProfileFeed";
import {ProfileContinue} from "./ProfileContinue";
import {formatDate} from "@/lib/utils/formatting/date";
import {formatCount} from "./profile-formatting";
import {useTabPush} from "../../hooks/use-tab-push";
import {useQueryClient} from "@tanstack/react-query";
import {MediaListGrid} from "../../components/media-list-grid";
import {Animated, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {UserRound, Activity, CalendarDays, ChartNoAxesCombined, Trophy, Library, CalendarClock} from "lucide-react-native";
import {SectionHeading} from "../../components/section-heading";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {AppText, Cover} from "../../components/ui";


const profileTabs = [
    { value: "profile", label: "Overview", icon: UserRound },
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
            tabs={userId
                ? profileTabs.map((tab) => tab.value === "calendar"
                    ? { value: "lists", label: "Lists", icon: Library } as const
                    : tab)
                : profileTabs}
            tabBarTopPadding={12}
            tabLayout="inline"
            scrollable
            initialTab="profile"
            onTabPress={(tab) => {
                if (tab === "profile") return;
                push({
                    pathname: tab === "lists" ? "/lists" : `/profile/${tab === "calendar" ? "releases" : tab}`,
                    params: { userId, username: data.user.name },
                });
            }}
            header={
                <ProfileHeader
                    data={data}
                    userId={userId}
                    action={headerAction}
                />
            }
        >
            {() =>
                <ProfileContent
                    data={data}
                    refreshing={refreshing}
                    userId={userId}
                />
            }
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
            contentContainerStyle={[styles.content, contentContainerStyle]}
            refreshControl={
                <RefreshControl
                    colors={[colors.accent]}
                    tintColor={colors.accent}
                    refreshing={refreshing}
                    onRefresh={() => void client.invalidateQueries({ queryKey: ["profile"] })}
                />
            }
        >
            <ProfileOverview data={data}/>
            <View style={styles.section}>
                <SectionHeading title="Media lists"/>
                <MediaListGrid
                    lists={data.lists}
                    userId={userId}
                    columns={3}
                />
            </View>
            <ProfileContinue userId={userId}/>
            <ProfilePinnedLists userId={userId}/>
            <ProfileFeed userId={userId} ratingSystem={data.user.ratingSystem}/>
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
        <View pointerEvents="box-none" style={styles.header}>
            <Cover
                pointerEvents="none"
                uri={data.user.backgroundImage}
                style={styles.banner}
            />
            <View pointerEvents="box-none" style={styles.headerContent}>
                <View pointerEvents="box-none" style={styles.avatarRow}>
                    <View pointerEvents="none" style={styles.avatarWrap}>
                        <Cover
                            uri={data.user.image}
                            label={data.user.name}
                            style={styles.avatar}
                        />
                        {!data.user.image &&
                            <View style={styles.avatarFallback}>
                                <AppText style={styles.initial}>
                                    {Array.from(data.user.name)[0].toLocaleUpperCase()}
                                </AppText>
                            </View>
                        }
                        <View style={styles.levelBadge}>
                            <AppText style={styles.level}>Lvl. {data.user.level}</AppText>
                        </View>
                    </View>
                    {data.social &&
                        <View pointerEvents="box-none" style={styles.social}>
                            {([
                                ["following", data.social.followsCount],
                                ["followers", data.social.followersCount],
                            ] as const).map(([kind, count]) =>
                                <Pressable
                                    key={kind}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${formatCount(count)} ${kind}`}
                                    onPress={() => push({
                                        pathname: "/profile/social",
                                        params: { kind, userId }
                                    })}
                                    style={({ pressed }) => [styles.socialCount, pressed && styles.pressed]}
                                >
                                    <AppText style={styles.socialValue}>
                                        {formatCount(count)}
                                    </AppText>
                                    <AppText muted style={styles.socialLabel}>
                                        {kind === "following" ? "Following" : "Followers"}
                                    </AppText>
                                </Pressable>)
                            }
                        </View>
                    }
                </View>
                <View pointerEvents="box-none" style={styles.identityRow}>
                    <View pointerEvents="none" style={styles.identity}>
                        <AppText heading style={styles.name}>
                            {data.user.name}
                        </AppText>
                        <View style={styles.joined}>
                            <CalendarClock size={12} color={colors.muted}/>
                            <AppText muted style={styles.joinedLabel}>Joined {formatDate(data.user.createdAt)}</AppText>
                        </View>
                    </View>
                    <PrivacyBadge value={data.user.privacy}/>
                </View>
                {action &&
                    <View style={styles.headerAction}>
                        {action}
                    </View>
                }
            </View>
        </View>
    );
});


const styles = StyleSheet.create({
    content: { padding: 16, gap: 24 },
    section: { gap: 12 },
    header: { paddingBottom: 8 },
    banner: { width: "100%", height: 132, borderRadius: 0 },
    headerContent: { paddingHorizontal: 16, gap: 12 },
    avatarRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 16,
        marginTop: -32
    },
    avatarWrap: { paddingBottom: 5 },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 4,
        borderColor: colors.background
    },
    avatarFallback: {
        position: "absolute",
        top: 4,
        bottom: 9,
        left: 4,
        right: 4,
        alignItems: "center",
        justifyContent: "center"
    },
    initial: { fontSize: 30, fontWeight: "700", color: colors.muted },
    levelBadge: {
        position: "absolute",
        bottom: 0,
        right: -3,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: colors.background,
        backgroundColor: colors.primary,
        paddingHorizontal: 8
    },
    level: {
        fontSize: 10,
        lineHeight: 15,
        fontWeight: "700",
        color: colors.accentText
    },
    social: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 4,
        gap: 8
    },
    socialCount: {
        flex: 1,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        gap: 2
    },
    socialValue: {
        fontSize: 19,
        lineHeight: 25,
        fontWeight: "700",
        fontVariant: ["tabular-nums"]
    },
    socialLabel: { fontSize: 11, lineHeight: 16 },
    identityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    identity: { flex: 1, minWidth: 0, gap: 5 },
    name: { fontSize: 24, lineHeight: 31 },
    joined: { flexDirection: "row", alignItems: "center", gap: 5 },
    joinedLabel: { fontSize: 12, lineHeight: 18, flexShrink: 1 },
    headerAction: { gap: 8, paddingTop: 2 },
    pressed: { opacity: 0.6 },
});
