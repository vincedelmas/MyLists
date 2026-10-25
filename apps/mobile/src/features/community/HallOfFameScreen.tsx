import {useState} from "react";
import {useIsFocused} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {FlatList, Pressable, RefreshControl, View} from "react-native";
import {Trophy} from "lucide-react-native";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {calculateMediaLevel} from "@/lib/utils/media/level";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {api} from "../../lib/api-client";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {useTabPush} from "../../hooks/use-tab-push";
import {AppText, Card, Cover, Field, Page, Select, StateView} from "../../components/ui";
import {ProgressBar} from "../../components/ProgressBar";
import {PrivacyBadge} from "../profile/PrivacyBadge";
import {colors, achievementColors} from "../../theme";
import {mediaColors, mediaIcons, mediaLabels, compareMediaTypes} from "../../lib/media";

const sortingOptions = [{ value: "normalized", label: "Overall" }, { value: "profile", label: "Profile level" }, ...ALL_MEDIA_TYPES.map(value => ({
    value,
    label: mediaLabels[value]
}))];

export function HallOfFameScreen() {
    const focused = useIsFocused();
    const push = useTabPush();
    const [search, setSearch] = useState("");
    const [sorting, setSorting] = useState("normalized");
    const term = useDebouncedValue(search.trim());
    const query = useInfiniteQuery({
        queryKey: ["community", "hall-of-fame", term, sorting], initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => api.hallOfFame({ page: pageParam, search: term, sorting }, signal),
        getNextPageParam: last => last.page < last.pages ? last.page + 1 : undefined, enabled: focused,
    });
    const items = query.data?.pages.flatMap(page => page.items) ?? [];
    const first = query.data?.pages[0];

    return (
        <Page title="Hall of Fame" subtitle="The rankings" back>
            <FlatList
                data={items} keyExtractor={item => String(item.id)} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                onEndReachedThreshold={0.5} onEndReached={() => {
                if (focused && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
            }}
                refreshControl={<RefreshControl tintColor={colors.accent} refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()}/>}
                ListHeaderComponent={<View style={{ gap: 18, paddingBottom: 20 }}>
                    <Field label="Find a profile" placeholder="Search by name…" value={search} clearable onChangeText={setSearch} autoCorrect={false}/>
                    <Select label="Rank by" value={sorting} onChange={setSorting} options={sortingOptions}/>
                    {first && <Card style={{ padding: 16, gap: 16 }}>
                        <AppText heading style={{ fontSize: 17 }}>You, across every list</AppText>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}>
                            {[...first.userRanks].sort((a, b) => compareMediaTypes(a.mediaType, b.mediaType)).map(rank => {
                                const Icon = mediaIcons[rank.mediaType];
                                return <View key={rank.mediaType} style={{ width: "46%", gap: 7 }}>
                                    <View style={{ flexDirection: "row", gap: 6 }}><Icon size={15} color={mediaColors[rank.mediaType]}/><AppText muted
                                                                                                                                                 style={{ fontSize: 12 }}>{mediaLabels[rank.mediaType]}</AppText></View>
                                    <AppText style={{ fontWeight: "700", fontSize: 20 }}>{rank.active ? `#${rank.rank ?? "—"}` : "Inactive"}</AppText>
                                    {rank.active && <><ProgressBar value={100 - (rank.percent ?? 100)} color={mediaColors[rank.mediaType]}/><AppText muted
                                                                                                                                                     style={{ fontSize: 10 }}>{rank.percent == null ? "Percentile unavailable" : `Top ${formatPercent(rank.percent)}`}</AppText></>}
                                </View>;
                            })}
                        </View>
                    </Card>}
                    <AppText muted style={{ fontSize: 12 }}>{formatNumber(first?.total ?? 0, { locale: "en" })} profiles ranked</AppText>
                </View>}
                renderItem={({ item }) => {
                    const medal = item.rank === 1 ? achievementColors.gold : item.rank === 2 ? achievementColors.silver : item.rank === 3 ? achievementColors.bronze : colors.muted;
                    return <Card style={{ marginBottom: 10, padding: 14, gap: 14, borderColor: item.isOwn ? colors.accent : colors.border }}>
                        <Pressable accessibilityRole="button" onPress={() => push({ pathname: "/people/[userId]", params: { userId: String(item.id) } })}
                                   style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.6 : 1 })}>
                            <View style={{ width: 28, alignItems: "center" }}>{item.rank && item.rank <= 3 ? <Trophy size={20} color={medal}/> :
                                <AppText muted>{item.rank ?? "—"}</AppText>}</View>
                            <Cover uri={item.image} label={item.name} style={{ width: 38, height: 38, borderRadius: 19 }}/>
                            <View style={{ flex: 1, gap: 2 }}><AppText numberOfLines={1} style={{ fontWeight: "600" }}>{item.name}</AppText>{item.isOwn &&
                                <AppText style={{ fontSize: 10, color: colors.accent }}>You</AppText>}</View>
                            <PrivacyBadge value={item.privacy}/>
                            <AppText style={{ fontSize: 18, fontWeight: "700" }}>{Math.floor(calculateMediaLevel(item.totalTime))}</AppText>
                        </Pressable>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                            {ALL_MEDIA_TYPES.map(mediaType => {
                                const setting = item.settings.find(value => value.mediaType === mediaType);
                                const Icon = mediaIcons[mediaType];
                                return <Pressable key={mediaType} disabled={!setting?.active} accessibilityRole="button"
                                                  accessibilityLabel={`${item.name}'s ${mediaLabels[mediaType]} list`}
                                                  onPress={() => push({ pathname: "/lists/[mediaType]", params: { mediaType, userId: item.id } })} style={({ pressed }) => ({
                                    width: "29%",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    opacity: !setting?.active ? 0.4 : pressed ? 0.6 : 1
                                })}>
                                    <Icon size={14} color={mediaColors[mediaType]}/><View><AppText muted style={{ fontSize: 10 }}>{mediaLabels[mediaType]}</AppText><AppText
                                    style={{ fontSize: 13, fontWeight: "600" }}>{setting?.active ? Math.floor(calculateMediaLevel(setting.timeSpent)) : "—"}</AppText></View>
                                </Pressable>;
                            })}
                        </View>
                    </Card>;
                }}
                ListEmptyComponent={<StateView loading={query.isPending} title={query.error ? "Couldn’t load rankings" : "No ranked profiles found"} message={query.error?.message}
                                               retry={query.error ? () => void query.refetch() : undefined}/>}
                ListFooterComponent={query.isFetchingNextPage ? <StateView loading/> : items.length && query.error ?
                    <StateView title="Couldn’t load more profiles" retry={() => void query.fetchNextPage()}/> : undefined}
            />
        </Page>
    );
}
