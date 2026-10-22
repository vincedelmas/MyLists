import {memo, useState} from "react";
import {colors} from "../../theme";
import type {MobileProfile} from "../../lib/api-client";
import {router, useLocalSearchParams} from "expo-router";
import {TopTabs} from "../../components/top-tabs";
import {AchievementsContent} from "./AchievementsScreen";
import {StatsContent} from "./StatsScreen";
import {ActivityContent} from "./ActivityScreen";
import {CalendarContent} from "./CalendarContent";
import {useIsFocused} from "expo-router";
import {PrivacyBadge} from "./PrivacyBadge";
import {ProfileExtras} from "./ProfileExtras";
import {formatCount, formatActivity} from "./profile-formatting";
import {useTabPush} from "../../hooks/use-tab-push";
import {ProgressBar} from "../../components/ProgressBar";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {mediaIcons, mediaLabels, mediaColors} from "../../lib/media";
import {RefreshControl, View, FlatList, Pressable} from "react-native";
import {Settings} from "lucide-react-native";
import {beginNavigationTiming} from "../../lib/diagnostics/navigation-timing";
import {profileOptions, profileActivityOptions} from "../../lib/react-query/query-options/profile.options";
import {AppText, Content, Cover, Page, QueryPanel, Section} from "../../components/ui";


const profileTabs = [
    {value: "profile", label: "Profile"},
    {value: "achievements", label: "Achievements"},
    {value: "stats", label: "My stats"},
    {value: "activity", label: "My activity"},
    {value: "calendar", label: "Release calendar"},
] as const;
type ProfileTab = typeof profileTabs[number]["value"];


export function ProfileScreen() {
    const params = useLocalSearchParams<{tab?: ProfileTab}>();
    const [tab, setTab] = useState<ProfileTab>(() => profileTabs.find((item) => item.value === params.tab)?.value ?? "profile");
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
                    <Settings size={21} color={colors.muted}/>
                </Pressable>
            }
        >
            <QueryPanel query={query}>
                {(data) => (
                    <>
                        <ProfileHeader data={data}/>
                        <TopTabs value={tab} tabs={profileTabs} onChange={setTab}/>
                        <View style={{flex: 1}}>
                            {tab === "profile" && <ProfileContent data={data} refreshing={query.isRefetching}/>}
                            {tab === "achievements" && <AchievementsContent/>}
                            {tab === "stats" && <StatsContent/>}
                            {tab === "activity" && <ActivityContent/>}
                            {tab === "calendar" && <CalendarContent/>}
                        </View>
                    </>
                )}
            </QueryPanel>
        </Page>
    );
}


// Focus changes update the query controller without rebuilding the profile.
const ProfileContent = memo(function ProfileContent({ data, refreshing }: { data: MobileProfile; refreshing: boolean }) {
    const push = useTabPush();
    const client = useQueryClient();

    return (
        <Content
            refreshControl={
                <RefreshControl
                    colors={[colors.accent]}
                    tintColor={colors.accent}
                    refreshing={refreshing}
                    onRefresh={() => void client.invalidateQueries({ queryKey: ["profile"] })}
                />
            }
        >
            <View style={{gap: 12}}>
                <AppText heading style={{fontSize: 17}}>Your media lists</AppText>
                <View style={{flexDirection: "row", flexWrap: "wrap", gap: 12}}>
                    {data.lists.map((list) => {
                        const Icon = mediaIcons[list.mediaType];
                        return (
                            <Pressable key={list.mediaType} accessibilityRole="button"
                                onPress={() => push({pathname: "/lists/[mediaType]", params: {mediaType: list.mediaType}})}
                                style={({pressed}) => ({flexBasis: "47%", flexGrow: 1, gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.6 : 1})}>
                                <View style={{flexDirection: "row", alignItems: "center", gap: 8}}>
                                    <Icon size={22} color={mediaColors[list.mediaType]}/>
                                    <AppText style={{fontWeight: "600", flex: 1}}>{mediaLabels[list.mediaType]}</AppText>
                                </View>
                                <AppText muted style={{fontSize: 12}}>Level {Math.floor(list.level)} · {formatCount(list.totalEntries)} titles</AppText>
                                <ProgressBar value={(list.level % 1) * 100} color={mediaColors[list.mediaType]}/>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
            <RecentFeed ratingSystem={data.user.ratingSystem}/>
            <ProfileExtras ratingSystem={data.user.ratingSystem}/>
            {data.highlights.mode !== "disabled" &&
                <View style={{ gap: 12 }}>
                    <AppText heading style={{ fontSize: 17 }}>
                        {data.highlights.title}
                    </AppText>
                    {data.highlights.items.length ?
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
                                    <Cover uri={item.mediaCover} style={{ width: 112, height: 168 }}/>
                                    <AppText numberOfLines={2} style={{ fontSize: 12 }}>
                                        {item.mediaName}
                                    </AppText>
                                </Pressable>
                            )}
                        />
                        :
                        <AppText muted>
                            No highlighted media yet. Add favorites to your lists to see them here.
                        </AppText>
                    }
                </View>
            }
        </Content>
    );
});


const ProfileHeader = memo(function ProfileHeader({data}: {data: MobileProfile}) {
    const push = useTabPush();
    return (
        <View style={{ gap: 0, paddingHorizontal: 16, paddingTop: 8 }}>
            <Cover
                uri={data.user.backgroundImage}
                style={{ width: "100%", height: 72, borderRadius: 16 }}
            />
            <View style={{ paddingHorizontal: 8, gap: 14 }}>
                <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-end", marginTop: -26 }}>
                    <Cover
                        uri={data.user.image}
                        label={data.user.name}
                        style={{
                            width: 56,
                            height: 56,
                            borderWidth: 4,
                            borderRadius: 40,
                            borderColor: colors.background,
                        }}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                        <AppText heading style={{ fontSize: 22, lineHeight: 28 }}>
                            {data.user.name}
                        </AppText>
                        <AppText muted style={{ fontSize: 12 }}>
                            Joined {new Date(data.user.createdAt).getUTCFullYear()}
                        </AppText>
                    </View>
                    <PrivacyBadge value={data.user.privacy}/>
                </View>
                <View
                    style={{
                        gap: 24,
                        paddingBottom: 0,
                        flexDirection: "row",
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}
                >
                    {([["following", data.social.followsCount], ["followers", data.social.followersCount]] as const)
                        .map(([kind, count]) => (
                            <Pressable
                                key={kind}
                                accessibilityRole="button"
                                style={{ paddingVertical: 8 }}
                                accessibilityLabel={`${count} ${kind}`}
                                onPressIn={() => beginNavigationTiming("/profile/social", "press-in")}
                                onPress={() => push({ pathname: "/profile/social", params: { kind } })}
                            >
                                <AppText style={{ fontSize: 16, fontWeight: "700" }}>
                                    {formatCount(count)}{" "}
                                    <AppText muted style={{ fontSize: 13, fontWeight: "400" }}>
                                        {kind}
                                    </AppText>
                                </AppText>
                            </Pressable>
                        ))}
                </View>
            </View>
        </View>
    );
});

function RecentFeed({ratingSystem}: {ratingSystem: MobileProfile["user"]["ratingSystem"]}) {
    const focused = useIsFocused();
    const push = useTabPush();
    const query = useQuery({...profileActivityOptions, enabled: focused});
    return (
        <Section title="Recent feed">
            <QueryPanel query={query}>
                {(items) => items.length ? items.slice(0, 10).map((item) => (
                    <Pressable key={item.id} accessibilityRole="button"
                        onPress={() => push({pathname: "/media/[mediaType]/[mediaId]", params: {mediaType: item.mediaType, mediaId: String(item.mediaId)}})}
                        style={{padding: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border}}>
                        <AppText style={{fontWeight: "600"}}>{item.mediaName}</AppText>
                        <AppText muted>{formatActivity(item, ratingSystem)}</AppText>
                        <AppText muted style={{fontSize: 11}}>{new Date(item.timestamp).toLocaleString()}</AppText>
                    </Pressable>
                )) : <AppText muted style={{padding: 16}}>Your tracking updates will appear here.</AppText>}
            </QueryPanel>
        </Section>
    );
}
