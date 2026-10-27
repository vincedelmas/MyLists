import {memo, useCallback, useMemo, useRef, useState} from "react";
import {useIsFocused} from "expo-router";
import {FlatList, RefreshControl, View, Pressable} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {Flame} from "lucide-react-native";
import {api} from "../../lib/api-client";
import {AppText, Cover, Page, StateView} from "../../components/ui";
import {MediaCard} from "../../components/media-card";
import {FilterButtons} from "../../components/filter-buttons";
import {colors} from "../../theme";
import {mediaLabels} from "../../lib/media";
import {useTabPush} from "../../hooks/use-tab-push";
import {useResolveMutation} from "../../lib/react-query/query-mutations/media.mutations";
import {formatDate, compareDateInputs} from "@/lib/utils/formatting/date";


type Trend = Awaited<ReturnType<typeof api.trends>>["seriesTrends"][number];


const filters = [
    { value: "all", label: "All media" },
    { value: "series", label: "Series", mediaType: "series" },
    { value: "movies", label: "Movies", mediaType: "movies" },
    { value: "games", label: "Games", mediaType: "games" },
] as const;


export function TrendsScreen() {
    const focused = useIsFocused();
    const push = useTabPush();
    const [tab, setTab] = useState<typeof filters[number]["value"]>("all");
    const query = useQuery({
        queryKey: ["community", "trends"],
        queryFn: ({ signal }) => api.trends(signal),
        enabled: focused
    });
    const resolve = useResolveMutation();
    const data = query.data;
    const allTrends = useMemo(() => data
        ? [...data.seriesTrends, ...data.moviesTrends, ...data.gamesTrends]
            .sort((a, b) => compareDateInputs(b.releaseDate, a.releaseDate))
        : [], [data]);
    const items = !data || tab === "all"
        ? allTrends
        : tab === "series" ? data.seriesTrends : tab === "movies" ? data.moviesTrends : data.gamesTrends;
    const hero = data
        ? tab === "series" ? data.seriesTrends[0] : tab === "games" ? data.gamesTrends[0] : data.moviesTrends[0]
        : undefined;
    const opening = useRef(false);
    const { mutate } = resolve;
    const open = useCallback((item: Trend) => {
        if (opening.current) return;
        opening.current = true;
        mutate({ mediaType: item.mediaType, apiId: item.apiId }, {
            onSuccess: ({ mediaId }) => push({
                pathname: "/media/[mediaType]/[mediaId]",
                params: { mediaType: item.mediaType, mediaId: String(mediaId) }
            }),
            onSettled: () => {
                opening.current = false;
            },
        });
    }, [mutate, push]);
    const renderItem = useCallback(({ item }: { item: Trend }) =>
        <TrendingTitle item={item} open={open}/>, [open]);

    return (
        <Page
            title="Weekly trends"
            subtitle="Popular this week"
            back
        >
            <FlatList
                data={items}
                numColumns={2}
                windowSize={7}
                initialNumToRender={8}
                maxToRenderPerBatch={6}
                keyExtractor={item => `${item.mediaType}:${item.apiId}`}
                contentContainerStyle={{ padding: 10, paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={query.isRefetching}
                        tintColor={colors.accent}
                        onRefresh={() => void query.refetch()}
                    />
                }
                ListHeaderComponent={
                    <View style={{ padding: 6, gap: 18, paddingBottom: 18 }}>
                        <FilterButtons
                            label="Trending media"
                            value={tab}
                            onChange={setTab}
                            options={filters}
                        />
                        {hero &&
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`See details for ${hero.displayName}`}
                                disabled={resolve.isPending}
                                onPress={() => open(hero)}
                                style={({ pressed }) => ({ borderRadius: 14, overflow: "hidden", opacity: pressed ? 0.7 : 1 })}
                            >
                                <Cover
                                    uri={hero.posterPath}
                                    style={{ width: "100%", height: 280, borderRadius: 0 }}
                                />
                                <View
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        backgroundColor: "rgba(0,0,0,0.55)",
                                        justifyContent: "flex-end",
                                        padding: 20,
                                        gap: 8
                                    }}
                                >
                                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                                        <Flame size={15} color={colors.rating}/>
                                        <AppText
                                            style={{ color: colors.rating, fontSize: 11, fontWeight: "700" }}
                                        >
                                            #1 TRENDING
                                        </AppText>
                                    </View>
                                    <AppText heading>
                                        {hero.displayName}
                                    </AppText>
                                    <AppText style={{ fontSize: 12 }}>{mediaLabels[hero.mediaType]} · {formatDate(hero.releaseDate)}</AppText>
                                    <AppText
                                        numberOfLines={2}
                                        style={{ fontSize: 12 }}
                                    >
                                        {hero.overview}
                                    </AppText>
                                    <AppText style={{ fontSize: 12, color: colors.accent }}>
                                        {resolve.isPending ? "Opening…" : "See Details →"}
                                    </AppText>
                                </View>
                            </Pressable>
                        }
                        {resolve.error &&
                            <AppText
                                accessibilityRole="alert"
                                style={{ color: colors.error }}
                            >
                                {resolve.error.message}
                            </AppText>
                        }
                        <AppText
                            muted
                            style={{ fontSize: 12 }}
                        >Trending titles · {items.length} {items.length === 1 ? "title" : "titles"}</AppText>
                    </View>
                }
                renderItem={renderItem}
                ListEmptyComponent={
                    <StateView
                        loading={query.isPending}
                        title={query.error ? "Couldn’t load trends" : "No trending data available right now."}
                        message={query.error?.message}
                        retry={query.error ? () => void query.refetch() : undefined}
                    />
                }
            />
        </Page>
    );
}


const TrendingTitle = memo(function TrendingTitle({ item, open }: { item: Trend; open: (item: Trend) => void }) {
    return (
        <MediaCard
            name={item.displayName}
            cover={item.posterPath}
            onPress={() => open(item)}
            detail={`${mediaLabels[item.mediaType]} · ${formatDate(item.releaseDate)}`}
        />
    );
});
