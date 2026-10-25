import { useCallback, useState } from "react";
import { useIsFocused } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, Keyboard, Pressable, RefreshControl, StyleSheet, View, ScrollView } from "react-native";
import { ChartNoAxesColumnIncreasing, Clapperboard, Clock3, Search, Trophy } from "lucide-react-native";
import { AppText, Button, Cover, Field, Page, QueryPanel, StateView } from "../../components/ui";
import { SectionTabs } from "../../components/section-tabs";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import { usePuzzleReset } from "../../hooks/use-puzzle-reset";
import { useSwipeTabs } from "../../hooks/use-swipe-tabs";
import { useTabPush } from "../../hooks/use-tab-push";
import {
    moviedleOptions,
    moviedleLeaderboardOptions,
    moviedleSuggestionsOptions,
} from "../../lib/react-query/query-options/moviedle.options";
import { useMoviedleGuess } from "../../lib/react-query/query-mutations/moviedle.mutations";
import type { api } from "../../lib/api-client";
import { colors, spacing } from "../../theme";

type Daily = Awaited<ReturnType<typeof api.moviedle>>;
const tabs = [
    { value: "play", label: "Play", icon: Clapperboard },
    { value: "stats", label: "Your stats", icon: ChartNoAxesColumnIncreasing },
    { value: "leaderboard", label: "Leaderboard", icon: Trophy },
] as const;

function ResetCountdown({ resetsAt }: { resetsAt: string }) {
    const client = useQueryClient();
    const reset = useCallback(() => {
        void client.invalidateQueries({ queryKey: ["moviedle"] });
    }, [client]);
    const countdown = usePuzzleReset(resetsAt, reset);
    return (
        <View style={styles.countdown}>
            <Clock3 size={13} color={colors.muted} />
            <AppText muted style={styles.caption}>
                New poster in {countdown}
            </AppText>
        </View>
    );
}

function DailyGame({ data, refreshing, refetch }: { data: Daily; refreshing: boolean; refetch: () => unknown }) {
    const focused = useIsFocused();
    const push = useTabPush();
    const [search, setSearch] = useState("");
    const [posterArea, setPosterArea] = useState({ width: 0, height: 0 });
    const posterWidth = Math.min(posterArea.width, posterArea.height * 2 / 3);
    const [suggestionsOpen, setSuggestionsOpen] = useState(true);
    const debounced = useDebouncedValue(search.trim());
    const mutation = useMoviedleGuess();
    const completed = !!data.userData?.completed;
    const suggestions = useQuery({
        ...moviedleSuggestionsOptions(debounced),
        enabled: focused && !completed && debounced.length >= 2,
    });
    const searching = search.trim() !== debounced || suggestions.isFetching;
    const items = !suggestionsOpen || searching || suggestions.error || completed ? [] : (suggestions.data ?? []);
    const guess = (action: "guess" | "skip") => {
        Keyboard.dismiss();
        mutation.mutate(
            action === "guess"
                ? { mediadleId: data.mediadleId, action, guess: search.trim() }
                : { mediadleId: data.mediadleId, action },
            { onSuccess: () => setSearch("") },
        );
    };
    return (
        <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, styles.gameContent]}
            refreshControl={
                <RefreshControl tintColor={colors.accent} refreshing={refreshing} onRefresh={() => void refetch()} />
            }
        >
            <View style={styles.intro}>
                <AppText muted style={styles.caption}>
                    DAILY POSTER · #{String(data.mediadleId).padStart(4, "0")}
                </AppText>
                <AppText muted>One movie. {data.maxAttempts} attempts.</AppText>
            </View>
            <View
                style={styles.posterWrap}
                onLayout={({ nativeEvent: { layout } }) => setPosterArea({ width: layout.width, height: layout.height })}
            >
                <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                    <Cover
                        uri={data.result?.cover ?? `data:image/png;base64,${data.pixelatedCover}`}
                        label={data.result?.name ?? "Today's pixelated movie poster"}
                        style={[styles.poster, { width: posterWidth, height: posterWidth * 3 / 2 }]}
                    />
                </View>
            </View>
            <View style={styles.controls}>
                <View style={styles.attemptHeading}>
                    <AppText style={styles.heading}>Attempts</AppText>
                    <AppText muted>
                        {data.userData?.attempts ?? 0} / {data.maxAttempts}
                    </AppText>
                </View>
                <View style={styles.attempts}>
                    {Array.from({ length: data.maxAttempts }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.attempt,
                                index < (data.userData?.attempts ?? 0) &&
                                    (data.userData?.succeeded && index === data.userData.attempts - 1
                                        ? styles.correct
                                        : styles.used),
                            ]}
                        />
                    ))}
                </View>
                {completed ? (
                    <View style={styles.result}>
                        <AppText heading>{data.userData?.succeeded ? "That's a wrap!" : "End credits"}</AppText>
                        <AppText>{data.result?.name}</AppText>
                        <AppText muted>
                            {data.userData?.succeeded
                                ? `Found in ${data.userData.attempts} ${data.userData.attempts === 1 ? "try" : "tries"}.`
                                : "A new poster arrives tomorrow."}
                        </AppText>
                        {data.result && (
                            <Button
                                secondary
                                label="View movie"
                                onPress={() =>
                                    push({
                                        pathname: "/media/[mediaType]/[mediaId]",
                                        params: { mediaType: "movies", mediaId: data.result!.mediaId },
                                    })
                                }
                            />
                        )}
                    </View>
                ) : (
                    <>
                        {mutation.data && !mutation.data.correct && (
                            <AppText accessibilityRole="alert" muted>
                                {mutation.variables?.action === "skip"
                                    ? "Skipped. The poster is a little clearer."
                                    : "Not quite. The poster is a little clearer."}
                            </AppText>
                        )}
                        <Field
                            label="Which movie is it?"
                            placeholder="Search for a movie title"
                            value={search}
                            onChangeText={(text) => {
                                setSearch(text);
                                setSuggestionsOpen(true);
                            }}
                            editable={!mutation.isPending}
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {!completed && (
                            <View style={styles.guessActions}>
                                <Button
                                    label="Guess movie"
                                    pending={mutation.isPending}
                                    disabled={!search.trim()}
                                    onPress={() => guess("guess")}
                                />
                                <Button
                                    secondary
                                    label="Skip attempt"
                                    disabled={mutation.isPending}
                                    onPress={() => guess("skip")}
                                />
                            </View>
                        )}
                        {search.trim().length >= 2 && searching && <AppText muted>Searching movies…</AppText>}
                        {suggestionsOpen &&
                            search.trim().length >= 2 &&
                            !searching &&
                            !items.length &&
                            !suggestions.error && (
                                <AppText muted>No suggestions. You can still guess the title you entered.</AppText>
                            )}
                        {suggestions.error && (
                            <StateView
                                title="Couldn’t load suggestions"
                                message={suggestions.error.message}
                                retry={() => void suggestions.refetch()}
                            />
                        )}
                    </>
                )}
                {mutation.error && (
                    <View style={styles.error}>
                        <AppText accessibilityRole="alert">{mutation.error.message}</AppText>
                        <AppText muted>
                            Your progress has been reloaded. Check the attempt count before trying again.
                        </AppText>
                    </View>
                )}
                {items.map((item) => (
                    <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${item.name}`}
                        disabled={mutation.isPending}
                        onPress={() => {
                            setSearch(item.name);
                            setSuggestionsOpen(false);
                            Keyboard.dismiss();
                        }}
                        style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                    >
                        <Search size={16} color={colors.muted} />
                        <AppText style={styles.flex}>{item.name}</AppText>
                    </Pressable>
                ))}
            </View>
            <ResetCountdown resetsAt={data.resetsAt} />
        </ScrollView>
    );
}

function GameStats({ data }: { data: Daily }) {
    const stats = data.userData?.stats;
    const metrics = [
        ["Played", stats?.totalPlayed ?? 0],
        ["Won", stats?.totalWon ?? 0],
        ["Win rate", `${(stats?.winRate ?? 0).toFixed(0)}%`],
        ["Current streak", stats?.currentStreak ?? 0],
        ["Best streak", stats?.bestStreak ?? 0],
        ["Average attempts", (stats?.averageAttempts ?? 0).toFixed(1)],
    ] as const;
    const distribution = Array.from({ length: data.maxAttempts }, (_, index) => ({
        attempt: index + 1,
        count: stats?.attempts.filter((item) => item.attempts === index + 1).length ?? 0,
    }));
    const maxCount = Math.max(1, ...distribution.map((item) => item.count));
    return (
        <FlatList
            data={distribution}
            keyExtractor={(item) => String(item.attempt)}
            contentContainerStyle={styles.content}
            ListHeaderComponent={
                <View style={styles.stack}>
                    <AppText heading>Your stats</AppText>
                    <View style={styles.metrics}>
                        {metrics.map(([label, value]) => (
                            <View key={label} style={styles.metric}>
                                <AppText style={styles.metricValue}>{value}</AppText>
                                <AppText muted style={styles.caption}>
                                    {label}
                                </AppText>
                            </View>
                        ))}
                    </View>
                    <AppText style={styles.heading}>Attempts per completed puzzle</AppText>
                </View>
            }
            renderItem={({ item }) => (
                <View style={styles.distribution}>
                    <AppText muted style={styles.rank}>
                        {item.attempt}
                    </AppText>
                    <View style={[styles.bar, { flex: Math.max(item.count, 1) }]}>
                        <AppText>{item.count}</AppText>
                    </View>
                    <View style={{ flex: Math.max(0, maxCount - item.count) }} />
                </View>
            )}
            ListFooterComponent={<ResetCountdown resetsAt={data.resetsAt} />}
        />
    );
}

function Leaderboard() {
    const focused = useIsFocused();
    const query = useQuery({ ...moviedleLeaderboardOptions, enabled: focused });
    const push = useTabPush();
    return (
        <QueryPanel query={query}>
            {(data) => (
                <FlatList
                    data={data.entries}
                    keyExtractor={(item) => String(item.userId)}
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl
                            tintColor={colors.accent}
                            refreshing={query.isRefetching}
                            onRefresh={() => void query.refetch()}
                        />
                    }
                    ListHeaderComponent={
                        <View style={styles.stack}>
                            <AppText heading>Leaderboard</AppText>
                            <AppText muted>Ranked by wins, best streak, then average attempts.</AppText>
                            {data.currentUserEntry && (
                                <AppText style={styles.heading}>Your rank · #{data.currentUserEntry.rank}</AppText>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`View ${item.name}'s profile`}
                            onPress={() => push({ pathname: "/people/[userId]", params: { userId: item.userId } })}
                            style={styles.leader}
                        >
                            <AppText muted style={styles.rank}>
                                {item.rank}
                            </AppText>
                            <Cover uri={item.image} label={item.name} style={styles.avatar} />
                            <View style={styles.flex}>
                                <AppText style={styles.heading}>{item.name}</AppText>
                                <AppText muted style={styles.caption}>
                                    {item.bestStreak} best streak · {item.averageAttempts.toFixed(1)} avg.
                                </AppText>
                            </View>
                            <AppText style={styles.wins}>
                                {item.totalWon}
                                <AppText muted> wins</AppText>
                            </AppText>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <StateView
                            title="The leaderboard is waiting"
                            message="Complete today's puzzle to get started."
                        />
                    }
                />
            )}
        </QueryPanel>
    );
}

export function MoviedleScreen() {
    const focused = useIsFocused();
    const [tab, setTab] = useState<"play" | "stats" | "leaderboard">("play");
    const query = useQuery({ ...moviedleOptions, enabled: focused });
    const swipeHandlers = useSwipeTabs(tabs, tab, setTab);
    return (
        <Page title="Moviedle" brand back>
            <View style={styles.flex} {...swipeHandlers}>
                <SectionTabs tabs={tabs} value={tab} onChange={setTab} />
                {tab === "leaderboard" ? (
                    <Leaderboard />
                ) : (
                    <QueryPanel query={query}>
                        {(data) =>
                            tab === "play" ? (
                                <DailyGame
                                    key={data.mediadleId}
                                    data={data}
                                    refreshing={query.isRefetching}
                                    refetch={query.refetch}
                                />
                            ) : (
                                <GameStats data={data} />
                            )
                        }
                    </QueryPanel>
                )}
            </View>
        </Page>
    );
}
const styles = StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    stack: { gap: spacing.lg },
    intro: { alignItems: "center", gap: spacing.xs },
    caption: { fontSize: 11, lineHeight: 17 },
    gameContent: { flexGrow: 1, paddingBottom: spacing.lg },
    posterWrap: { flex: 1, minHeight: 160 },
    poster: { borderRadius: 12 },
    controls: { gap: spacing.md },
    attemptHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    heading: { fontSize: 15, fontWeight: "600" },
    attempts: { flexDirection: "row", gap: spacing.sm },
    attempt: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.secondary },
    used: { backgroundColor: colors.error },
    correct: { backgroundColor: colors.accent },
    result: { gap: spacing.md, padding: spacing.lg, borderRadius: 14, backgroundColor: colors.surface },
    guessActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingTop: spacing.md },
    countdown: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.lg,
    },
    suggestion: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 10,
    },
    flex: { flex: 1 },
    pressed: { opacity: 0.6 },
    error: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.error, borderRadius: 10 },
    metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    metric: {
        flexBasis: "46%",
        flexGrow: 1,
        padding: spacing.lg,
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: 12,
    },
    metricValue: { fontSize: 26, fontWeight: "700", lineHeight: 32 },
    distribution: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
    bar: { minWidth: 32, backgroundColor: colors.primary, padding: spacing.sm, borderRadius: 6 },
    leader: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
    rank: { width: 22 },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    wins: { fontSize: 14, fontWeight: "600" },
});
