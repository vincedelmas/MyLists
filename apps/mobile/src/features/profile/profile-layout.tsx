import { memo, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { colors } from "../../theme";
import type { MobileProfile } from "../../lib/api-client";
import { useLocalSearchParams } from "expo-router";
import { AchievementsContent } from "./AchievementsScreen";
import { StatsContent } from "./StatsScreen";
import { ActivityContent } from "./ActivityScreen";
import { CalendarContent } from "./CalendarContent";
import { PrivacyBadge } from "./PrivacyBadge";
import { ProfileFeed } from "./ProfileFeed";
import { ProfileContinue } from "./ProfileContinue";
import { formatCount } from "./profile-formatting";
import { useTabPush } from "../../hooks/use-tab-push";
import { useQueryClient } from "@tanstack/react-query";
import { mediaIcons, mediaLabels, mediaColors } from "../../lib/media";
import {
    Animated,
    RefreshControl,
    View,
    Pressable,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import { UserRound, Activity, CalendarDays, ChartNoAxesCombined, Trophy } from "lucide-react-native";
import { Button as NativeButton } from "@expo/ui";
import { NativeHost } from "../../components/native-host";
import { ProfileScrollContext, useProfileScroll } from "../../hooks/use-profile-scroll";
import { AppText, Cover } from "../../components/ui";

const profileTabs = [
    { value: "profile", label: "Profile", icon: UserRound },
    { value: "activity", label: "Activity", icon: Activity },
    { value: "calendar", label: "Releases", icon: CalendarDays },
    { value: "stats", label: "Stats", icon: ChartNoAxesCombined },
    { value: "achievements", label: "Achievements", icon: Trophy },
] as const;
type ProfileTab = (typeof profileTabs)[number]["value"];

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
    const params = useLocalSearchParams<{ tab?: ProfileTab }>();
    const [tab, setTab] = useState<ProfileTab>(
        () => profileTabs.find((item) => item.value === params.tab)?.value ?? "profile",
    );
    const [scrollY] = useState(() => new Animated.Value(0));
    const offsets = useRef(new Map<ProfileTab, number>());
    const [initialOffset, setInitialOffset] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [tabBarHeight, setTabBarHeight] = useState(68);
    const [viewportHeight, setViewportHeight] = useState(0);
    const onScroll = useMemo(
        () =>
            Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: true,
                listener: (event: NativeSyntheticEvent<NativeScrollEvent>) =>
                    offsets.current.set(tab, event.nativeEvent.contentOffset.y),
            }),
        [scrollY, tab],
    );
    const selectTab = (next: ProfileTab) => {
        if (next === tab) return;
        const current = Math.max(0, offsets.current.get(tab) ?? initialOffset);
        // Preserve the visible header. Restore a pane's deeper position only
        // when the header is already fully collapsed.
        const nextOffset = current < headerHeight ? current : Math.max(headerHeight, offsets.current.get(next) ?? 0);
        offsets.current.set(next, nextOffset);
        scrollY.setValue(nextOffset);
        setInitialOffset(nextOffset);
        setTab(next);
    };
    const getOffset = useCallback(() => offsets.current.get(tab) ?? initialOffset, [tab, initialOffset]);
    const scrollContext = useMemo(
        () => ({ onScroll, initialOffset, headerHeight, tabBarHeight, viewportHeight, getOffset }),
        [onScroll, initialOffset, headerHeight, tabBarHeight, viewportHeight, getOffset],
    );
    const translateY = scrollY.interpolate({
        inputRange: [0, Math.max(headerHeight, 1)],
        outputRange: [0, -headerHeight],
        extrapolate: "clamp",
    });
    return (
        <ProfileScrollContext.Provider value={scrollContext}>
            <View
                style={{ flex: 1, overflow: "hidden" }}
                onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            >
                {headerHeight > 0 && (
                    <View style={{ flex: 1 }}>
                        {tab === "profile" && <ProfileContent data={data} refreshing={refreshing} userId={userId} />}
                        {tab === "achievements" && <AchievementsContent userId={userId} />}
                        {tab === "stats" && <StatsContent userId={userId} />}
                        {tab === "activity" && <ActivityContent userId={userId} />}
                        {tab === "calendar" && <CalendarContent userId={userId} />}
                    </View>
                )}
                <Animated.View
                    pointerEvents="box-none"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1,
                        backgroundColor: colors.background,
                        transform: [{ translateY }],
                    }}
                >
                    <View
                        pointerEvents="box-none"
                        style={{ padding: 16, paddingBottom: 0 }}
                        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
                    >
                        <ProfileHeader data={data} userId={userId} action={headerAction} />
                    </View>
                    <View onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}>
                        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}>
                            {profileTabs.map(({ value, label, icon: Icon }) => (
                                <Pressable
                                    key={value}
                                    accessibilityRole="tab"
                                    accessibilityLabel={label}
                                    accessibilityState={{ selected: tab === value }}
                                    onPress={() => selectTab(value)}
                                    style={({ pressed }) => ({
                                        flex: 1,
                                        minHeight: 68,
                                        paddingVertical: 10,
                                        paddingHorizontal: 2,
                                        gap: 6,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: pressed ? 0.6 : 1,
                                        borderBottomWidth: 2,
                                        borderBottomColor: tab === value ? colors.accent : "transparent",
                                    })}
                                >
                                    <Icon size={22} color={tab === value ? colors.accent : colors.muted} />
                                    <AppText
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.8}
                                        style={{
                                            fontSize: 10,
                                            fontWeight: "600",
                                            color: tab === value ? colors.accent : colors.muted,
                                        }}
                                    >
                                        {label}
                                    </AppText>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </ProfileScrollContext.Provider>
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
    const push = useTabPush();
    const client = useQueryClient();
    const { scrollProps, contentContainerStyle } = useProfileScroll();

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
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {data.lists.map((list) => {
                        const Icon = mediaIcons[list.mediaType];
                        return (
                            <Pressable
                                key={list.mediaType}
                                accessibilityRole="button"
                                onPress={() =>
                                    push({
                                        pathname: "/lists/[mediaType]",
                                        params: { mediaType: list.mediaType, userId },
                                    })
                                }
                                style={({ pressed }) => ({
                                    flexBasis: "47%",
                                    flexGrow: 1,
                                    gap: 6,
                                    padding: 10,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                    opacity: pressed ? 0.6 : 1,
                                })}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Icon size={18} color={mediaColors[list.mediaType]} />
                                    <AppText style={{ fontWeight: "600", flex: 1, fontSize: 13 }}>
                                        {mediaLabels[list.mediaType]}
                                    </AppText>
                                </View>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                                    <AppText muted style={{ fontSize: 12 }}>
                                        Level {Math.floor(list.level)}
                                    </AppText>
                                    <AppText style={{ fontSize: 12, color: mediaColors[list.mediaType] }}>
                                        {Math.floor((list.level % 1) * 100)}%
                                    </AppText>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
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
        user: Pick<MobileProfile["user"], "id" | "name" | "privacy" | "image" | "backgroundImage" | "createdAt">;
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
                style={{ width: "100%", height: 128, borderRadius: 16 }}
            />
            <View pointerEvents="box-none" style={{ paddingHorizontal: 8, gap: 14 }}>
                <View
                    pointerEvents="box-none"
                    style={{ flexDirection: "row", gap: 14, alignItems: "flex-end", marginTop: -44 }}
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
                    <View pointerEvents="none" style={{ flex: 1, gap: 4 }}>
                        <AppText heading style={{ fontSize: 22, lineHeight: 28 }}>
                            {data.user.name}
                        </AppText>
                        <AppText muted style={{ fontSize: 12 }}>
                            Joined in {new Date(data.user.createdAt).getUTCFullYear()}
                        </AppText>
                    </View>
                    <PrivacyBadge value={data.user.privacy} />
                </View>
                {action}
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
