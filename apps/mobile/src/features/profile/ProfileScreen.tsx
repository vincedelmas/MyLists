import {memo} from "react";
import {colors} from "../../theme";
import type {MobileProfile} from "../../lib/api-client";
import {router} from "expo-router";
import {useIsFocused} from "expo-router";
import {PrivacyBadge} from "./PrivacyBadge";
import {ProfileExtras} from "./ProfileExtras";
import {formatCount} from "./profile-formatting";
import {useTabPush} from "../../hooks/use-tab-push";
import {ProgressBar} from "../../components/ProgressBar";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {mediaIcons, mediaLabels, mediaColors} from "../../lib/media";
import {RefreshControl, View, FlatList, Pressable} from "react-native";
import {Activity, ChartNoAxesCombined, Settings} from "lucide-react-native";
import {beginNavigationTiming} from "../../lib/diagnostics/navigation-timing";
import {profileOptions} from "../../lib/react-query/query-options/profile.options";
import {AppText, Content, Cover, MenuRow, Page, QueryPanel, Section} from "../../components/ui";


export function ProfileScreen() {
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
                    onPress={() => router.navigate("/(tabs)/(settings)/settings")}
                >
                    <Settings size={21} color={colors.muted}/>
                </Pressable>
            }
        >
            <QueryPanel query={query}>
                {(data) => (
                    <ProfileContent data={data} refreshing={query.isRefetching}/>
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
            <View style={{ gap: 0 }}>
                <Cover
                    uri={data.user.backgroundImage}
                    style={{ width: "100%", height: 144, borderRadius: 16 }}
                />
                <View style={{ paddingHorizontal: 8, gap: 14 }}>
                    <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-end", marginTop: -26 }}>
                        <Cover
                            uri={data.user.image}
                            label={data.user.name}
                            style={{
                                width: 80,
                                height: 80,
                                borderWidth: 4,
                                borderRadius: 40,
                                borderColor: colors.background,
                            }}
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                            <AppText heading style={{ fontSize: 25, lineHeight: 32 }}>
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
                            paddingBottom: 10,
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
                                    style={{ paddingVertical: 10 }}
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
            <Section title="Your media lists">
                {data.lists.map((list) => {
                    const Icon = mediaIcons[list.mediaType];

                    return (
                        <View key={list.mediaType}>
                            <MenuRow
                                title={mediaLabels[list.mediaType]}
                                icon={<Icon color={mediaColors[list.mediaType]} size={22}/>}
                                onPress={() => push({ pathname: "/lists/[mediaType]", params: { mediaType: list.mediaType } })}
                                detail={`Level ${Math.floor(list.level)} · ${formatCount(list.totalEntries)} entries · ${formatCount(list.timeSpent)} hours`}
                            />
                            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                                <ProgressBar
                                    value={(list.level % 1) * 100}
                                    color={mediaColors[list.mediaType]}
                                />
                            </View>
                        </View>
                    );
                })}
            </Section>
            <Section title="Explore your profile">
                <MenuRow
                    title="Statistics"
                    detail="Your progress across every media type"
                    onPress={() => push("/profile/stats")}
                    icon={<ChartNoAxesCombined size={21} color={colors.accent}/>}
                />
                <MenuRow
                    title="Recent feed"
                    detail="Your recent updates and tracking history"
                    icon={<Activity size={21} color={colors.accent}/>}
                    onPress={() => push("/profile/activity")}
                />
            </Section>
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
