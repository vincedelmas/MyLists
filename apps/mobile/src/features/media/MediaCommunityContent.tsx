import {SearchField} from "../../components/search-field";
import {useMemo, useState} from "react";
import {Avatar} from "../../components/avatar";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {formatDate} from "@/lib/utils/formatting/date";
import {zeroPad} from "@/lib/utils/formatting/number";
import {useIsFocused} from "expo-router";
import {useInfiniteQuery} from "@tanstack/react-query";
import {Animated, Pressable, RefreshControl, StyleSheet, View} from "react-native";
import {AppText, StateView} from "../../components/ui";
import {mediaCommunityOptions} from "../../lib/react-query/query-options/media.options";
import {useCollapsingScroll} from "../../hooks/use-collapsing-scroll";
import {useTabPush} from "../../hooks/use-tab-push";
import type {api, MediaParams} from "../../lib/api-client";
import {Rating} from "../../components/rating";
import {formatMinutes} from "@/lib/utils/formatting/number";
import {colors} from "../../theme";

type Person = Awaited<ReturnType<typeof api.mediaCommunity>>["items"][number];

function ActivityPerson({ item }: { item: Person }) {
    const push = useTabPush();
    const [expanded, setExpanded] = useState(false);
    const progress = [
        item.progress.season != null ? `S${zeroPad(item.progress.season)}.E${zeroPad(item.progress.episode ?? 0)}` : null,
        item.progress.playtimeMinutes != null ? formatMinutes(item.progress.playtimeMinutes) : null,
        item.progress.pages != null ? `Page ${item.progress.pages}` : null,
        item.progress.chapters != null ? `Chapter ${item.progress.chapters}` : null,
        item.progress.repeats ? `${item.progress.repeats} repeats` : null,
        item.progress.platform,
    ]
        .filter(Boolean)
        .join(" · ");
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}'s profile`}
            onPress={() => push({ pathname: "/people/[userId]", params: { userId: String(item.id) } })}
            style={styles.person}
        >
            <Avatar image={item.image} name={item.name} size={44}/>
            <View style={styles.personInfo}>
                <AppText style={styles.personName}>{item.name}</AppText>
                <AppText muted style={styles.smallText}>
                    {item.status}
                    {item.favorite ? " · Favorite" : ""}
                </AppText>
                {progress && (
                    <AppText muted style={styles.smallText}>
                        {progress}
                    </AppText>
                )}
                {item.updatedAt && <AppText muted style={styles.smallText}>{formatDate(item.updatedAt)}</AppText>}
                {item.comment && (
                    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Collapse comment" : "Read full comment"} accessibilityState={{ expanded }}
                               onPress={event => {
                                   event.stopPropagation();
                                   setExpanded(value => !value);
                               }} style={{ minHeight: 48, justifyContent: "center", gap: 4 }}>
                        <AppText numberOfLines={expanded ? undefined : 3} style={styles.comment}>{item.comment}</AppText>
                        <AppText muted style={styles.smallText}>{expanded ? "Show less" : "Read comment"}</AppText>
                    </Pressable>
                )}
            </View>
            <Rating value={item.rating} system={item.ratingSystem}/>
        </Pressable>
    );
}

export function MediaCommunityContent({
                                          params,
                                          mode,
                                      }: {
    params: MediaParams;
    mode: "follows" | "community";
}) {
    const focused = useIsFocused();
    const [search, setSearch] = useState("");
    const term = useDebouncedValue(search.trim());
    const searching = mode === "community" && term !== search.trim();
    const query = useInfiniteQuery({ ...mediaCommunityOptions(params, mode === "community" ? term || undefined : undefined), enabled: focused && !searching });
    const { scrollProps, contentContainerStyle } = useCollapsingScroll();
    const first = query.data?.pages[0];
    const items = useMemo(() => searching ? [] : query.data?.pages.flatMap(page => page.items) ?? [], [query.data, searching]);
    const sections =
        mode === "follows"
            ? [{ key: "follows", title: "People you follow", data: first?.follows ?? [] }]
            : [{ key: "community", title: "Community activity", data: items }];
    return (
        <Animated.SectionList
            {...scrollProps}
            sections={sections}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListHeaderComponent={<View style={{ padding: 16, gap: 16 }}>
                {mode === "community" &&
                    <SearchField
                        hideLabel
                        clearable
                        value={search}
                        autoCorrect={false}
                        label="Search users"
                        onChangeText={setSearch}
                        placeholder="Search community users…"
                    />
                }
            </View>}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={contentContainerStyle}
            keyExtractor={(item) => String(item.id)}
            initialNumToRender={12}
            windowSize={7}
            refreshControl={
                <RefreshControl
                    tintColor={colors.accent}
                    refreshing={query.isRefetching && !query.isFetchingNextPage}
                    onRefresh={() => void query.refetch()}
                />
            }
            onEndReachedThreshold={0.5}
            onEndReached={() => {
                if (mode === "community" && focused && !searching && query.hasNextPage && !query.isFetching && !query.isError)
                    void query.fetchNextPage();
            }}
            renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                    <AppText heading style={styles.sectionTitle}>
                        {section.title}
                    </AppText>
                    {section.key === "follows" && first && !section.data.length && (
                        <AppText muted>No followed users tracking this title yet.</AppText>
                    )}
                    {section.key === "community" && first && (
                        <>
                            <AppText muted style={styles.smallText}>
                                {first.total} tracking · {first.stats.completedCount} completed ·{" "}
                                {first.stats.likedCount} favorites
                            </AppText>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{[
                                { label: "Re-experiences", value: String(first.stats.totalRedo) },
                                ...(params.mediaType === "games" ? [{ label: "Time played", value: formatMinutes(first.stats.totalPlaytime) }] : []),
                                ...(["series", "anime", "books", "manga"].includes(params.mediaType) ? [{
                                    label: "Total progress",
                                    value: String(first.stats.totalSpecific)
                                }] : []),
                            ].map(stat => <View key={stat.label} style={{ padding: 12, minWidth: 120, borderRadius: 12, gap: 6, backgroundColor: colors.surface }}><AppText muted
                                                                                                                                                                            style={{ fontSize: 11 }}>{stat.label}</AppText><AppText
                                style={{ fontSize: 17, fontWeight: "600" }}>{stat.value}</AppText></View>)}</View>
                            {first.stats.averageRating != null && (
                                <Rating value={first.stats.averageRating} system="score"/>
                            )}
                        </>
                    )}
                </View>
            )}
            renderItem={({ item }) => <ActivityPerson item={item}/>}
            renderSectionFooter={({ section }) =>
                !first ? (
                    <StateView
                        loading={query.isPending || searching}
                        title="Couldn’t load activity"
                        message={query.error?.message}
                        retry={() => void query.refetch()}
                    />
                ) : section.key === "community" && !items.length ? (
                    <StateView
                        loading={query.isPending || searching}
                        title={query.isError ? "Couldn’t load activity" : search ? "No matching users" : "No community activity yet"}
                        message={query.error?.message}
                        retry={query.isError ? () => void query.refetch() : undefined}
                    />
                ) : null
            }
            ListFooterComponent={
                mode === "community" && query.isFetchingNextPage ? (
                    <StateView loading/>
                ) : mode === "community" && query.isError && items.length ? (
                    <StateView title="Couldn’t load more activity" retry={() => void query.fetchNextPage()}/>
                ) : undefined
            }
        />
    );
}

const styles = StyleSheet.create({
    person: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatar: { width: 42, height: 42, borderRadius: 21 },
    personInfo: { flex: 1, gap: 4 },
    personName: { fontWeight: "600" },
    comment: { fontSize: 12, lineHeight: 18 },

    sectionHeader: { gap: 16, padding: 16 },
    sectionTitle: { fontSize: 18 },
    smallText: { fontSize: 12 },
});
