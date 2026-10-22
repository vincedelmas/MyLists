import { memo, useCallback, useMemo, useRef, useState } from "react";
import { colors } from "../../theme";
import type { MobileProfile } from "../../lib/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { TopTabs } from "../../components/top-tabs";
import { AchievementsContent } from "./AchievementsScreen";
import { StatsContent } from "./StatsScreen";
import { ActivityContent } from "./ActivityScreen";
import { CalendarContent } from "./CalendarContent";
import { useIsFocused } from "expo-router";
import { PrivacyBadge } from "./PrivacyBadge";
import { ProfileFeed } from "./ProfileFeed";
import { ProfileContinue } from "./ProfileContinue";
import { formatCount } from "./profile-formatting";
import { useTabPush } from "../../hooks/use-tab-push";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mediaIcons, mediaLabels, mediaColors } from "../../lib/media";
import {
    Animated,
    RefreshControl,
    View,
    FlatList,
    Pressable,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import { Settings } from "lucide-react-native";
import { Button as NativeButton } from "@expo/ui";
import { NativeHost } from "../../components/native-host";
import { ProfileScrollContext, useProfileScroll } from "../../hooks/use-profile-scroll";
import { profileOptions } from "../../lib/react-query/query-options/profile.options";
import { AppText, Cover, Page, QueryPanel } from "../../components/ui";

const profileTabs = [
    { value: "profile", label: "Profile" },
    { value: "achievements", label: "Achievements" },
    { value: "stats", label: "My stats" },
    { value: "activity", label: "My activity" },
    { value: "calendar", label: "Release calendar" },
] as const;
type ProfileTab = (typeof profileTabs)[number]["value"];

export function ProfileScreen() {
    const params = useLocalSearchParams<{ tab?: ProfileTab }>();
    const [tab, setTab] = useState<ProfileTab>(
        () => profileTabs.find((item) => item.value === params.tab)?.value ?? "profile",
    );
    const [scrollY] = useState(() => new Animated.Value(0));
    const offsets = useRef(new Map<ProfileTab, number>());
    const [initialOffset, setInitialOffset] = useState(0);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [tabBarHeight, setTabBarHeight] = useState(49);
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
    const focused = useIsFocused();
    const query = useQuery({ ...profileOptions, enabled: focused });

    return (
        <Page
            title="MyLists"
            subtitle="Your profile"
            action={
                <Pressable
                    style={{ padding: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                    onPress={() => router.push("/(tabs)/(profile)/settings")}
                >
                    <Settings size={21} color={colors.muted} />
                </Pressable>
            }
        >
            <QueryPanel query={query}>
                {(data) => (
                    <ProfileScrollContext.Provider value={scrollContext}>
                        <View
                            style={{ flex: 1, overflow: "hidden" }}
                            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
                        >
                            {headerHeight > 0 && (
                                <View style={{ flex: 1 }}>
                                    {tab === "profile" && (
                                        <ProfileContent data={data} refreshing={query.isRefetching} />
                                    )}
                                    {tab === "achievements" && <AchievementsContent />}
                                    {tab === "stats" && <StatsContent />}
                                    {tab === "activity" && <ActivityContent />}
                                    {tab === "calendar" && <CalendarContent />}
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
                                    <ProfileHeader data={data} />
                                </View>
                                <View onLayout={(event) => setTabBarHeight(event.nativeEvent.layout.height)}>
                                    <TopTabs value={tab} tabs={profileTabs} onChange={selectTab} />
                                </View>
                            </Animated.View>
                        </View>
                    </ProfileScrollContext.Provider>
                )}
            </QueryPanel>
        </Page>
    );
}

// Focus changes update the query controller without rebuilding the profile.
const ProfileContent = memo(function ProfileContent({
    data,
    refreshing,
}: {
    data: MobileProfile;
    refreshing: boolean;
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
                    Your media lists
                </AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {data.lists.map((list) => {
                        const Icon = mediaIcons[list.mediaType];
                        return (
                            <Pressable
                                key={list.mediaType}
                                accessibilityRole="button"
                                onPress={() =>
                                    push({ pathname: "/lists/[mediaType]", params: { mediaType: list.mediaType } })
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
            <ProfileContinue />
            <ProfileFeed ratingSystem={data.user.ratingSystem} />
            {data.highlights.mode !== "disabled" && (
                <View style={{ gap: 12 }}>
                    <AppText heading style={{ fontSize: 17 }}>
                        {data.highlights.title}
                    </AppText>
                    {data.highlights.items.length ? (
                        <FlatList
                            horizontal={true}
                            data={data.highlights.items}
                            contentContainerStyle={{ gap: 12 }}
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
                            renderItem={({ item }) => (
                                <Pressable
                                    accessibilityRole="button"
                                    style={{ width: 112, gap: 8 }}
                                    accessibilityLabel={item.mediaName}
                                    onPress={() =>
                                        push({
                                            pathname: "/media/[mediaType]/[mediaId]",
                                            params: { mediaType: item.mediaType, mediaId: String(item.mediaId) },
                                        })
                                    }
                                >
                                    <Cover uri={item.mediaCover} style={{ width: 112, height: 168 }} />
                                    <AppText numberOfLines={2} style={{ fontSize: 12 }}>
                                        {item.mediaName}
                                    </AppText>
                                </Pressable>
                            )}
                        />
                    ) : (
                        <AppText muted>No highlighted media yet. Add favorites to your lists to see them here.</AppText>
                    )}
                </View>
            )}
        </Animated.ScrollView>
    );
});

const ProfileHeader = memo(function ProfileHeader({ data }: { data: MobileProfile }) {
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
                                onPress={() => push({ pathname: "/profile/social", params: { kind } })}
                            />
                        </NativeHost>
                    ))}
                </View>
            </View>
        </View>
    );
});
