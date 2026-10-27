import {useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery} from "@tanstack/react-query";
import {Animated, FlatList, Linking, Pressable, RefreshControl, View} from "react-native";
import {ArrowUpRight, CalendarDays} from "lucide-react-native";
import {AppText, Button, Cover, MenuRow, QueryPanel} from "../../components/ui";
import {SectionHeading} from "../../components/section-heading";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {useTabPush} from "../../hooks/use-tab-push";
import {gameHltbOptions, mediaDetailsOptions} from "../../lib/react-query/query-options/media.options";
import type {api, MediaParams, MobileMedia} from "../../lib/api-client";
import {formatDate} from "@/lib/utils/formatting/date";
import {formatCurrency, formatMinutes, zeroPad} from "@/lib/utils/formatting/number";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {colors} from "../../theme";
import {mediaColors} from "../../lib/media";

type Related = Awaited<ReturnType<typeof api.mediaDetails>>["similar"];

function RelatedTitles({ title, items, params }: { title: string; items: Related; params: MediaParams }) {
    const push = useTabPush();
    return <View style={{ gap: 12 }}><SectionHeading title={title}/><FlatList horizontal data={items} keyExtractor={item => String(item.mediaId)}
                                                                              showsHorizontalScrollIndicator={false} initialNumToRender={4}
                                                                              contentContainerStyle={{ gap: 12 }}
                                                                              renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.mediaName}
                                                                                                                   onPress={() => push({
                                                                                                                       pathname: "/media/[mediaType]/[mediaId]",
                                                                                                                       params: { ...params, mediaId: item.mediaId }
                                                                                                                   })} style={{ width: 112, gap: 8 }}>
                                                                                  <Cover uri={item.mediaCover} label={item.mediaName}
                                                                                         style={{ width: 112, height: 168, borderRadius: 12 }}/><AppText numberOfLines={2} style={{
                                                                                  fontSize: 12,
                                                                                  lineHeight: 18
                                                                              }}>{item.mediaName}</AppText></Pressable>}/></View>;
}

export function MediaDetailsContent({ params, data, refetch, refreshing }: { params: MediaParams; data: MobileMedia; refetch: () => unknown; refreshing: boolean }) {
    const focused = useIsFocused();
    const [expanded, setExpanded] = useState(false);
    const query = useQuery({ ...mediaDetailsOptions(params), enabled: focused, staleTime: 60_000 });
    const hltb = useQuery({ ...gameHltbOptions(params), enabled: focused && params.mediaType === "games" && data.media.hltbNeedsCheck });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const push = useTabPush();
    const media = data.media;
    const next = media.nextEpisode?.date ? media.nextEpisode : null;
    const color = mediaColors[params.mediaType];
    const completionMinutes = data.progress.timing.kind === "fixed" ? (media.totalProgress ?? 0) * data.progress.timing.minutesPerUnit : data.progress.timing.kind === "media-duration" ? (media.totalProgress ?? 1) * (media.duration ?? 0) : 0;
    const facts = media.facts.filter(fact => !["Provider score", "Votes", "Runtime (minutes)", "Main story (hours)", "Main + extras (hours)", "Completionist (hours)"].includes(fact.label));
    const credits = [
        { label: "Director", job: "creator" }, { label: "Created by", job: "creator" }, { label: "Composer", job: "compositor" }, { label: "Publisher", job: "publisher" },
    ] as const;
    return <Animated.ScrollView {...scrollProps} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[{ padding: 16, gap: 24 }, contentContainerStyle]}
                                refreshControl={<RefreshControl tintColor={colors.accent} refreshing={refreshing || query.isRefetching} onRefresh={() => {
                                    refetch();
                                    void query.refetch();
                                }}/>}>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: `${color}40`, backgroundColor: `${color}08`, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><CalendarDays size={17} color={color}/><AppText muted
                                                                                                                                 style={{ fontSize: 12 }}>{next ? "Next episode" : "Release date"}</AppText></View>
            <AppText style={{ fontSize: 20, lineHeight: 28, fontWeight: "600" }}>{formatDate(next?.date ?? media.releaseDate)}</AppText>
            {next && <AppText style={{ color }}>S{zeroPad(next.season ?? 0)}.E{zeroPad(next.episode ?? 0)}</AppText>}
        </View>
        <View style={{ gap: 12 }}><SectionHeading title="Synopsis"/>{media.tagline &&
            <AppText style={{ fontSize: 16, lineHeight: 24, fontStyle: "italic", color }}>{media.tagline}</AppText>}
            <AppText selectable numberOfLines={expanded ? undefined : 5} style={{ fontSize: 14, lineHeight: 23 }}>{media.synopsis || "No synopsis available yet."}</AppText>
            {media.synopsis && media.synopsis.length > 240 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
                                                                         style={{ minHeight: 48, justifyContent: "center" }}><AppText
                style={{ color: colors.accent }}>{expanded ? "Show less" : "Read more"}</AppText></Pressable>}
        </View>
        <View style={{ gap: 12 }}><SectionHeading title="About this title"/><View style={{ flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderColor: colors.border }}>
            {completionMinutes > 0 && <Fact label="Completion" value={formatMinutes(completionMinutes)}/>}
            {media.duration != null &&
                <Fact label={params.mediaType === "series" || params.mediaType === "anime" ? "Episode duration" : "Runtime"} value={formatMinutes(media.duration)}/>}
            {facts.map(fact => {
                const credit = credits.find(item => item.label === fact.label && !(fact.label === "Publisher" && params.mediaType === "books"));
                const value = ["Last aired", "End date"].includes(fact.label) ? formatDate(fact.value) : ["Total Budget", "Total Revenue"].includes(fact.label) ? formatCurrency(Number(fact.value)) : ["Language", "Original language"].includes(fact.label) ? formatLocaleName(fact.value, "language") : fact.label === "Country" ? formatLocaleName(fact.value, "region") : fact.value;
                return <Fact key={fact.label} label={fact.label} value={value}
                             onPress={credit ? () => push({ pathname: "/media/job", params: { mediaType: params.mediaType, job: credit.job, name: fact.value } }) : undefined}/>;
            })}
        </View></View>
        {params.mediaType === "games" && <View style={{ gap: 12 }}><SectionHeading title="How long to beat"/><View style={{ flexDirection: "row", flexWrap: "wrap" }}>{[
            { label: "Main story", value: hltb.data?.hltbMainTime ?? media.completionHours }, {
                label: "Main + extras",
                value: hltb.data?.hltbMainAndExtraTime ?? media.hltbMainAndExtraTime
            }, { label: "Completionist", value: hltb.data?.hltbTotalCompleteTime ?? media.hltbTotalCompleteTime },
        ].map(item => <Fact key={item.label} label={item.label}
                            value={hltb.isFetching ? "Checking…" : formatMinutes(item.value ? item.value * 60 : null, { onlyHours: true })}/>)}</View>{hltb.isError &&
            <Button secondary label="Retry time lookup" onPress={() => void hltb.refetch()}/>}</View>}
        <QueryPanel query={query}>{details => <>
            {details.genres.length > 0 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{details.genres.map(genre => <View key={genre.name} style={{
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: colors.surface
            }}><AppText style={{ fontSize: 12 }}>{genre.name}</AppText></View>)}</View>}
            {details.seasons?.length ?
                <View style={{ gap: 12 }}><SectionHeading title="Season breakdown"/><FlatList horizontal data={details.seasons} keyExtractor={item => String(item.season)}
                                                                                              showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}
                                                                                              renderItem={({ item }) => <View style={{
                                                                                                  width: 132,
                                                                                                  padding: 14,
                                                                                                  gap: 8,
                                                                                                  borderRadius: 14,
                                                                                                  backgroundColor: colors.surface
                                                                                              }}><AppText style={{
                                                                                                  color,
                                                                                                  fontWeight: "600"
                                                                                              }}>S{zeroPad(item.season)}</AppText><AppText>Season {item.season}</AppText><AppText
                                                                                                  muted
                                                                                                  style={{ fontSize: 12 }}>{item.episodes} episodes</AppText></View>}/></View> : null}
            {[
                { title: "Authors", items: details.authors, job: "creator" as const }, { title: "Main actors", items: details.actors, job: "actor" as const },
                { title: "Developers", items: details.companies.filter(item => item.developer), job: "creator" as const }, {
                    title: "Publishers",
                    items: details.companies.filter(item => item.publisher),
                    job: "publisher" as const
                },
                { title: "Game platforms", items: details.platforms }, { title: "Networks", items: details.networks },
            ].filter(section => section.items.length).map(section => <View key={section.title} style={{ gap: 12 }}><SectionHeading title={section.title}/><FlatList horizontal
                                                                                                                                                                    data={section.items}
                                                                                                                                                                    keyExtractor={item => item.name}
                                                                                                                                                                    showsHorizontalScrollIndicator={false}
                                                                                                                                                                    initialNumToRender={3}
                                                                                                                                                                    contentContainerStyle={{ gap: 10 }}
                                                                                                                                                                    renderItem={({ item }) =>
                                                                                                                                                                        <Pressable
                                                                                                                                                                            accessibilityRole={section.job ? "button" : undefined}
                                                                                                                                                                            disabled={!section.job}
                                                                                                                                                                            onPress={() => push({
                                                                                                                                                                                pathname: "/media/job",
                                                                                                                                                                                params: {
                                                                                                                                                                                    mediaType: params.mediaType,
                                                                                                                                                                                    job: section.job!,
                                                                                                                                                                                    name: item.name
                                                                                                                                                                                }
                                                                                                                                                                            })}
                                                                                                                                                                            style={{
                                                                                                                                                                                width: 156,
                                                                                                                                                                                minHeight: 80,
                                                                                                                                                                                padding: 14,
                                                                                                                                                                                borderRadius: 14,
                                                                                                                                                                                gap: 8,
                                                                                                                                                                                backgroundColor: colors.surface
                                                                                                                                                                            }}><AppText
                                                                                                                                                                            numberOfLines={3}
                                                                                                                                                                            style={{
                                                                                                                                                                                fontSize: 14,
                                                                                                                                                                                lineHeight: 20
                                                                                                                                                                            }}>{item.name}</AppText>{section.job &&
                                                                                                                                                                            <ArrowUpRight
                                                                                                                                                                                size={16}
                                                                                                                                                                                color={colors.accent}/>}
                                                                                                                                                                        </Pressable>}/></View>)}
            {details.series.length > 0 && <RelatedTitles title="In the same series" items={details.series} params={params}/>}
            {details.similar.length > 0 && <RelatedTitles title="Similar titles" items={details.similar} params={params}/>}
            {details.collections.length > 0 &&
                <View style={{ gap: 12 }}><SectionHeading title="Popular collections"/>{details.collections.map(collection => <MenuRow key={collection.id} title={collection.title}
                                                                                                                                       detail={`${collection.itemsCount} titles · ${collection.likeCount} likes · ${collection.ownerName}`}
                                                                                                                                       onPress={() => push({
                                                                                                                                           pathname: "/library/[kind]",
                                                                                                                                           params: {
                                                                                                                                               kind: "collection",
                                                                                                                                               id: collection.id
                                                                                                                                           }
                                                                                                                                       })}/>)}</View>}
        </>}</QueryPanel>
        <View style={{ gap: 12 }}>{params.mediaType === "books" && !media.provider.url && <AppText muted>Book added manually</AppText>}{media.provider.url &&
            <Button secondary fullWidth label={`View on ${media.provider.name}`} onPress={() => void Linking.openURL(media.provider.url!)}/>}{media.homepage &&
            <Button secondary fullWidth label="Official website" onPress={() => void Linking.openURL(media.homepage!)}/>}</View>
        {data.refresh.reason && <AppText muted style={{
            fontSize: 12,
            lineHeight: 18
        }}>{data.refresh.reason}{data.refresh.nextAllowedAt ? ` Available ${formatDate(data.refresh.nextAllowedAt)}.` : ""}</AppText>}
    </Animated.ScrollView>;
}

function Fact({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
    return <Pressable disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} onPress={onPress}
                      style={{ width: "50%", minHeight: 76, paddingVertical: 14, paddingRight: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}><AppText muted
                                                                                                                                                                              style={{
                                                                                                                                                                                  fontSize: 11,
                                                                                                                                                                                  lineHeight: 16
                                                                                                                                                                              }}>{label}</AppText><AppText
        selectable={!onPress} style={{ fontSize: 13, lineHeight: 20, color: onPress ? colors.accent : colors.text }}>{value}</AppText></Pressable>;
}
