import {useIsFocused} from "expo-router";
import {RefreshControl, View, FlatList, Pressable} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {router} from "expo-router";
import {Activity, Award, ChartNoAxesCombined, Settings} from "lucide-react-native";
import {AppText, Content, Cover, MenuRow, Page, QueryPanel, Section, uiStyles} from "../../components/ui";
import {profileOptions} from "../../lib/react-query/query-options/profile.options";
import {colors} from "../../theme";
import {mediaIcons, mediaLabels, mediaColors} from "../../lib/media";
import {formatCount} from "./profile-formatting";

export function ProfileScreen() {
    const focused = useIsFocused();
    const query = useQuery({...profileOptions, enabled: focused});
    return (
        <Page
            title="MyLists"
            subtitle="Your profile"
            action={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Settings"
                    style={{padding: 12}}
                    onPress={() => router.navigate("/(tabs)/settings")}
                >
                    <Settings size={21} color={colors.muted} />
                </Pressable>
            }
        >
            <QueryPanel query={query}>
                {(data) => (
                    <Content
                        refreshControl={
                            <RefreshControl
                                refreshing={query.isRefetching}
                                onRefresh={() => void query.refetch()}
                                tintColor={colors.accent}
                                colors={[colors.accent]}
                            />
                        }
                    >
                        <Section>
                            <Cover
                                uri={data.user.backgroundImage}
                                style={{width: "100%", height: 110, borderRadius: 0}}
                            />
                            <View style={uiStyles.padded}>
                                <View style={uiStyles.row}>
                                    <Cover
                                        uri={data.user.image}
                                        label={data.user.name}
                                        style={{width: 64, height: 64, borderRadius: 32}}
                                    />
                                    <View style={{flex: 1, gap: 4}}>
                                        <AppText heading>{data.user.name}</AppText>
                                        <AppText muted style={{fontSize: 12}}>
                                            {data.user.privacy} profile · Joined{" "}
                                            {new Date(data.user.createdAt).getUTCFullYear()}
                                        </AppText>
                                    </View>
                                </View>
                                <AppText muted>
                                    {data.social.followsCount} following · {data.social.followersCount} followers
                                </AppText>
                                <View style={{flexDirection: "row", gap: 8}}>
                                    {[
                                        ["Entries", data.stats.totalEntries],
                                        ["Hours", data.stats.totalHours],
                                        ["Favorites", data.stats.totalFavorites],
                                    ].map(([label, value]) => (
                                        <View
                                            key={label}
                                            style={{
                                                flex: 1,
                                                padding: 12,
                                                backgroundColor: colors.secondary,
                                                borderRadius: 8,
                                                gap: 4,
                                            }}
                                        >
                                            <AppText style={{fontWeight: "700", fontSize: 20}}>
                                                {formatCount(Number(value))}
                                            </AppText>
                                            <AppText muted style={{fontSize: 12}}>
                                                {label}
                                            </AppText>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </Section>
                        <Section title="Your media lists">
                            {data.lists.map((list) => {
                                const Icon = mediaIcons[list.mediaType];
                                return (
                                    <MenuRow
                                        key={list.mediaType}
                                        title={mediaLabels[list.mediaType]}
                                        detail={`${formatCount(list.totalEntries)} entries · ${formatCount(list.timeSpent)} hours`}
                                        icon={<Icon color={mediaColors[list.mediaType]} size={22} />}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/lists/[mediaType]",
                                                params: {mediaType: list.mediaType},
                                            })
                                        }
                                    />
                                );
                            })}
                        </Section>
                        <Section title="Explore your profile">
                            <MenuRow
                                title="Statistics"
                                detail="Your progress across every media type"
                                icon={<ChartNoAxesCombined size={21} color={colors.accent} />}
                                onPress={() => router.push("/profile/stats")}
                            />
                            <MenuRow
                                title="Activity history"
                                detail="Your recent updates and tracking history"
                                icon={<Activity size={21} color={colors.accent} />}
                                onPress={() => router.push("/profile/activity")}
                            />
                            <MenuRow
                                title="Achievements"
                                detail="Milestones along the way"
                                icon={<Award size={21} color={colors.rating} />}
                                onPress={() => router.push("/profile/achievements")}
                            />
                        </Section>
                        {data.highlights.mode !== "disabled" && (
                            <View style={{gap: 12}}>
                                <AppText heading style={{fontSize: 17}}>
                                    {data.highlights.title}
                                </AppText>
                                {data.highlights.items.length ? (
                                    <FlatList
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        data={data.highlights.items}
                                        keyExtractor={(item) => `${item.mediaType}:${item.mediaId}`}
                                        contentContainerStyle={{gap: 12}}
                                        renderItem={({item}) => (
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityLabel={item.mediaName}
                                                onPress={() =>
                                                    router.push({
                                                        pathname: "/media/[mediaType]/[mediaId]",
                                                        params: {
                                                            mediaType: item.mediaType,
                                                            mediaId: String(item.mediaId),
                                                        },
                                                    })
                                                }
                                                style={{width: 112, gap: 8}}
                                            >
                                                <Cover uri={item.mediaCover} style={{width: 112, height: 168}} />
                                                <AppText numberOfLines={2} style={{fontSize: 12}}>
                                                    {item.mediaName}
                                                </AppText>
                                            </Pressable>
                                        )}
                                    />
                                ) : (
                                    <AppText muted>
                                        No highlighted media yet. Add favorites to your lists to see them here.
                                    </AppText>
                                )}
                            </View>
                        )}
                    </Content>
                )}
            </QueryPanel>
        </Page>
    );
}
