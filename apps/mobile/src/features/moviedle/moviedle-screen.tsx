import {SearchField} from "../../components/search-field";
import {memo, useCallback, useMemo, useState} from "react";
import {useIsFocused} from "expo-router";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {ActivityIndicator, FlatList, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, View} from "react-native";
import {Award, ChartNoAxesColumnIncreasing, Check, ChevronRight, Clapperboard, Clock3, Flame, Info, Search, Target, Trophy, X} from "lucide-react-native";
import {formatNumber, formatPercent} from "@/lib/utils/formatting/number";
import {colors, achievementColors, mediaColors} from "../../theme";
import type {api} from "../../lib/api-client";
import {useTabPush} from "../../hooks/use-tab-push";
import {usePuzzleReset} from "../../hooks/use-puzzle-reset";
import {useDebouncedValue} from "../../hooks/use-debounced-value";
import {PagedTabs} from "../../components/paged-tabs";
import {ActionSheet} from "../../components/action-sheet";
import {AppText, Button, Cover, Page, QueryPanel, StateView} from "../../components/ui";
import {useMoviedleGuess} from "../../lib/react-query/query-mutations/moviedle.mutations";
import {moviedleOptions, moviedleLeaderboardOptions, moviedleSuggestionsOptions} from "../../lib/react-query/query-options/moviedle.options";


type Daily = Awaited<ReturnType<typeof api.moviedle>>;


type Leader = Awaited<ReturnType<typeof api.moviedleLeaderboard>>["entries"][number];


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
            <Clock3 size={13} color={colors.muted}/>
            <AppText muted style={styles.caption}>Next poster in <AppText style={styles.timer}>
                {countdown}
            </AppText></AppText>
        </View>
    );
}


function DailyGame({ data, active, refreshing, refetch }: { data: Daily; active: boolean; refreshing: boolean; refetch: () => unknown }) {
    const push = useTabPush();
    const focused = useIsFocused();
    const mutation = useMoviedleGuess();
    const [guessOpen, setGuessOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [suggestionsOpen, setSuggestionsOpen] = useState(true);
    const [posterArea, setPosterArea] = useState({ width: 0, height: 0 });
    const posterWidth = Math.min(posterArea.width, posterArea.height * 2 / 3);
    const completed = !!data.userData?.completed;
    const succeeded = !!data.userData?.succeeded;
    const attempts = data.userData?.attempts ?? 0;
    const trimmed = search.trim();
    const debounced = useDebouncedValue(trimmed);
    const ready = trimmed.length >= 2 && trimmed === debounced;
    const suggestions = useQuery({
        ...moviedleSuggestionsOptions(debounced),
        enabled: focused && active && guessOpen && suggestionsOpen && !completed && ready
    });
    const searching = trimmed.length >= 2 && (!ready || suggestions.isFetching);
    const items = suggestionsOpen && ready && !searching && !suggestions.error && !completed ? suggestions.data ?? [] : [];
    const guess = (action: "guess" | "skip") => {
        if (mutation.isPending || completed || (action === "guess" && !trimmed)) return;
        Keyboard.dismiss();
        mutation.mutate(action === "guess" ? { mediadleId: data.mediadleId, action, guess: trimmed } : { mediadleId: data.mediadleId, action }, {
            onSuccess: () => {
                setSearch("");
                setGuessOpen(false);
                setSuggestionsOpen(true);
            },
        });
    };

    return (
        <>
            <ScrollView
                contentContainerStyle={styles.gameContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        tintColor={colors.accent}
                        onRefresh={() => void refetch()}
                    />
                }
            >
                <View style={styles.dailyHeading}>
                    <View style={styles.inline}>
                        <Clapperboard size={15} color={mediaColors.movies}/>
                        <AppText muted style={styles.eyebrow}>
                            DAILY COVER
                        </AppText>
                    </View>
                    <AppText style={styles.puzzleNumber}>No. {String(data.mediadleId).padStart(4, "0")}</AppText>
                </View>
                <View
                    style={styles.posterArea}
                    onLayout={({ nativeEvent: { layout } }) => {
                        setPosterArea(current => current.width === layout.width && current.height === layout.height
                            ? current
                            : { width: layout.width, height: layout.height });
                    }}
                >
                    <View style={styles.posterCenter}>
                        <Cover
                            label={data.result?.name ?? "Today's pixelated movie poster"}
                            uri={data.result?.cover ?? `data:image/png;base64,${data.pixelatedCover}`}
                            style={[
                                styles.poster,
                                { width: posterWidth, height: posterWidth * 3 / 2 }
                            ]}
                        />
                    </View>
                </View>
                <View style={styles.gameDock}>
                    <View style={styles.attemptHeading}>
                        <AppText style={styles.heading}>
                            {completed ? "Today's challenge" : "Which movie is it?"}
                        </AppText>
                        <AppText muted style={styles.caption}>{attempts} / {data.maxAttempts} used</AppText>
                    </View>
                    <View
                        style={styles.attempts}
                        accessible
                        accessibilityRole="progressbar"
                        accessibilityLabel="Attempts used"
                        accessibilityValue={{ min: 0, max: data.maxAttempts, now: attempts }}
                    >
                        {Array.from({ length: data.maxAttempts }, (_, index) => {
                            const used = index < attempts;
                            const correct = succeeded && index === attempts - 1;
                            const next = !completed && index === attempts;
                            const tint = correct ? colors.accent : used ? colors.error : next ? mediaColors.movies : colors.muted;

                            return (
                                <View
                                    key={index}
                                    style={[styles.attempt, used && { backgroundColor: `${tint}18`, borderColor: `${tint}60` }, next && styles.nextAttempt]}
                                >
                                    {correct
                                        ? <Check size={15} color={tint}/>
                                        : used
                                            ? <X size={14} color={tint}/>
                                            :
                                            <AppText
                                                style={[
                                                    styles.attemptNumber,
                                                    { color: tint }
                                                ]}
                                            >
                                                {index + 1}
                                            </AppText>
                                    }
                                </View>
                            );
                        })
                        }
                    </View>
                    {completed
                        ? <View style={styles.result}>
                            <View style={styles.resultHeading}>
                                {succeeded ? <Trophy size={23} color={achievementColors.gold}/> : <Clapperboard size={23} color={colors.muted}/>
                                }
                                <AppText heading style={styles.resultTitle}>
                                    {succeeded ? "That's a wrap!" : "End credits"}
                                </AppText>
                            </View>
                            <AppText numberOfLines={2} style={styles.movieTitle}>
                                {data.result?.name}
                            </AppText>
                            <AppText muted style={styles.caption}>
                                {succeeded
                                    ? `Found in ${attempts} ${attempts === 1 ? "try" : "tries"}. See you tomorrow.`
                                    : "A new film, a fresh chance tomorrow."}
                            </AppText>
                            {data.result &&
                                <Button
                                    fullWidth
                                    secondary
                                    label="View movie"
                                    onPress={() => push({
                                        pathname: "/media/[mediaType]/[mediaId]",
                                        params: { mediaType: "movies", mediaId: data.result!.mediaId }
                                    })}
                                />
                            }
                        </View>
                        : <>
                            <AppText
                                muted
                                accessibilityLiveRegion="polite"
                                style={styles.feedback}
                            >
                                {mutation.data && !mutation.data.correct
                                    ? mutation.variables?.action === "skip"
                                        ? "Skipped. The poster is a little clearer."
                                        : "Not quite. The poster is a little clearer."
                                    : "One poster. Each attempt reveals a little more."}
                            </AppText>
                            <View style={styles.actions}>
                                <View style={styles.skipAction}>
                                    <Button
                                        fullWidth
                                        secondary
                                        label="Skip"
                                        pending={mutation.isPending && mutation.variables?.action === "skip"}
                                        disabled={mutation.isPending}
                                        onPress={() => guess("skip")}
                                    />
                                </View>
                                <View style={styles.guessAction}>
                                    <Button
                                        fullWidth
                                        label="Guess movie"
                                        disabled={mutation.isPending}
                                        onPress={() => setGuessOpen(true)}
                                    />
                                </View>
                            </View>
                        </>
                    }
                    {mutation.error &&
                        <AppText accessibilityRole="alert" style={styles.error}>{mutation.error.message} Your progress has been reloaded. Check the attempts before trying
                            again.</AppText>
                    }
                </View>
            </ScrollView>
            {guessOpen && !completed &&
                <ActionSheet
                    title="Your guess"
                    dismiss={() => setGuessOpen(false)}
                >
                    <View style={styles.sheetContent}>
                        <AppText muted style={styles.caption}>Attempt {attempts + 1} of {data.maxAttempts} · Pick a title or enter your own.</AppText>
                        <SearchField
                            label="Movie title"
                            hideLabel
                            leadingIcon={
                                <Search size={20} color={colors.muted}/>
                            }
                            clearable
                            autoFocus
                            editable={!mutation.isPending}
                            value={search}
                            placeholder="Search movie titles…"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                            onChangeText={text => {
                                setSearch(text);
                                setSuggestionsOpen(true);
                            }}
                            textStyle={{ fontSize: 16 }}
                        />
                        <Button
                            fullWidth
                            label="Submit guess"
                            disabled={!trimmed}
                            pending={mutation.isPending}
                            onPress={() => guess("guess")}
                        />
                        {mutation.error &&
                            <AppText accessibilityRole="alert" style={styles.error}>{mutation.error.message} Progress reloaded; this may have used an attempt.</AppText>
                        }
                        {searching &&
                            <View style={styles.suggestionStatus}>
                                <ActivityIndicator size="small" color={colors.accent}/>
                                <AppText muted style={styles.caption}>
                                    Searching
                                    movies…
                                </AppText>
                            </View>
                        }
                        {suggestionsOpen && ready && !searching && suggestions.error &&
                            <View style={styles.sheetContent}>
                                <AppText
                                    accessibilityRole="alert"
                                    muted
                                    style={styles.caption}
                                >
                                    Couldn’t load suggestions. You can still submit your title.
                                </AppText>
                                <Button
                                    secondary
                                    label="Retry suggestions"
                                    onPress={() => void suggestions.refetch()}
                                />
                            </View>
                        }
                        {suggestionsOpen && ready && !searching && !items.length && !suggestions.error &&
                            <AppText muted style={styles.caption}>
                                No suggestions. You can still submit the title you entered.
                            </AppText>
                        }
                        {items.length > 0 &&
                            <View>
                                <AppText muted style={styles.suggestionsLabel}>
                                    MATCHING TITLES
                                </AppText>
                                {items.map(item =>
                                    <Pressable
                                        key={item.id}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select ${item.name}`}
                                        disabled={mutation.isPending}
                                        style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                                        onPress={() => {
                                            setSearch(item.name);
                                            setSuggestionsOpen(false);
                                            Keyboard.dismiss();
                                        }}
                                    >
                                        <Clapperboard size={17} color={mediaColors.movies}/>
                                        <AppText style={styles.identity}>
                                            {item.name}
                                        </AppText>
                                        <ChevronRight size={15} color={colors.muted}/>
                                    </Pressable>)
                                }
                            </View>
                        }
                    </View>
                </ActionSheet>
            }
        </>
    );
}


const GameStats = memo(function GameStats({ data }: { data: Daily }) {
    const stats = data.userData?.stats;
    const distribution = useMemo(() => {
        const counts = Array<number>(data.maxAttempts).fill(0);
        for (const item of stats?.attempts ?? []) counts[item.attempts - 1]++;

        return counts;
    }, [data.maxAttempts, stats?.attempts]);
    const maxCount = Math.max(1, ...distribution);
    const metrics = [
        ["Played all time", formatNumber(stats?.totalPlayed ?? 0)],
        ["Won all time", formatNumber(stats?.totalWon ?? 0)],
        ["Best streak", formatNumber(stats?.bestStreak ?? 0)],
        ["Avg. attempts", formatNumber(stats?.averageAttempts ?? 0, { fractionDigits: 1, locale: "en" })],
    ];

    return (
        <ScrollView contentContainerStyle={styles.statsContent}>
            <AppText heading style={styles.sectionTitle}>
                Your record
            </AppText>
            <View style={styles.heroMetrics}>
                <View style={styles.heroMetric}>
                    <Target size={21} color={colors.accent}/>
                    <AppText style={styles.heroValue}>
                        {formatPercent(stats?.winRate ?? 0, { fractionDigits: 0 })}
                    </AppText>
                    <AppText muted style={styles.caption}>
                        Win rate
                    </AppText>
                </View>
                <View style={styles.heroMetric}>
                    <Flame size={21} color={mediaColors.anime}/>
                    <AppText style={styles.heroValue}>
                        {formatNumber(stats?.currentStreak ?? 0)}
                    </AppText>
                    <AppText muted style={styles.caption}>
                        Current streak
                    </AppText>
                </View>
            </View>
            <View style={styles.metrics}>
                {metrics.map(([label, value]) =>
                    <View key={label} style={styles.metric}>
                        <AppText style={styles.metricValue}>
                            {value}
                        </AppText>
                        <AppText muted style={styles.caption}>
                            {label}
                        </AppText>
                    </View>)
                }
            </View>
            <View style={styles.distributionCard}>
                <AppText heading style={styles.heading}>
                    Guess distribution
                </AppText>
                <AppText muted style={styles.caption}>
                    Attempts per completed puzzle
                </AppText>
                <View style={styles.distributionRows}>
                    {distribution.map((count, index) =>
                        <View
                            key={index}
                            style={styles.distributionRow}
                            accessible
                            accessibilityLabel={`${index + 1} ${index === 0 ? "attempt" : "attempts"}: ${count} puzzles`}
                        >
                            <AppText muted style={styles.distributionNumber}>
                                {index + 1}
                            </AppText>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        { width: `${count / maxCount * 100}%` }
                                    ]}
                                />
                                <AppText style={styles.barCount}>
                                    {count}
                                </AppText>
                            </View>
                        </View>)
                    }
                </View>
                {!stats?.totalPlayed &&
                    <AppText muted style={styles.caption}>
                        Complete today's challenge to start your record.
                    </AppText>
                }
            </View>
        </ScrollView>
    );
});


const LeaderRow = memo(function LeaderRow({ item, own, onPress }: { item: Leader; own: boolean; onPress: (item: Leader) => void }) {
    const medal = item.rank === 1
        ? achievementColors.gold
        : item.rank === 2 ? achievementColors.silver : item.rank === 3 ? achievementColors.bronze : colors.muted;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rank ${item.rank}, ${item.name}, ${item.totalWon} wins. View profile`}
            onPress={() => onPress(item)}
            style={({ pressed }) => [styles.leader, own && styles.ownLeader, pressed && styles.pressed]}
        >
            <AppText
                style={[
                    styles.rank,
                    { color: medal }
                ]}
            >
                {item.rank}
            </AppText>
            <View>
                <Cover
                    uri={item.image}
                    label={item.name}
                    style={styles.avatar}
                />
                {!item.image &&
                    <View style={styles.avatarFallback}>
                        <AppText muted style={styles.avatarInitial}>
                            {Array.from(item.name)[0].toLocaleUpperCase()}
                        </AppText>
                    </View>
                }
            </View>
            <View style={styles.identity}>
                <AppText numberOfLines={1} style={styles.heading}>
                    {item.name}
                    {own ? " · You" : ""}
                </AppText>
                <AppText muted style={styles.leaderCaption}>{item.bestStreak} best streak · {item.averageAttempts.toFixed(1)} avg.</AppText>
            </View>
            <View style={styles.leaderScore}>
                <AppText style={styles.wins}>
                    {formatNumber(item.totalWon)}
                </AppText>
                <AppText muted style={styles.leaderCaption}>
                    wins
                </AppText>
            </View>
        </Pressable>
    );
});


function Leaderboard({ active }: { active: boolean }) {
    const push = useTabPush();
    const focused = useIsFocused();
    const query = useQuery({ ...moviedleLeaderboardOptions, enabled: focused && active });
    const openProfile = useCallback((item: Leader) => push({
        pathname: "/people/[userId]",
        params: { userId: item.userId }
    }), [push]);
    const ownId = query.data?.currentUserEntry?.userId;
    const renderItem = useCallback(({ item }: { item: Leader }) =>
        <LeaderRow
            item={item}
            own={item.userId === ownId}
            onPress={openProfile}
        />, [ownId, openProfile]);

    return (
        <QueryPanel query={query}>
            {data =>
                <View style={styles.fill}>
                    <FlatList
                        data={data.entries}
                        keyExtractor={item => String(item.userId)}
                        renderItem={renderItem}
                        contentContainerStyle={styles.leaderContent}
                        initialNumToRender={10}
                        windowSize={5}
                        refreshControl={
                            <RefreshControl
                                tintColor={colors.accent}
                                refreshing={query.isRefetching}
                                onRefresh={() => void query.refetch()}
                            />
                        }
                        ListHeaderComponent={
                            <View style={styles.leaderHeading}>
                                <View style={styles.inline}>
                                    <Trophy size={18} color={achievementColors.gold}/>
                                    <AppText heading style={styles.sectionTitle}>
                                        The sharpest eyes
                                    </AppText>
                                </View>
                                <AppText muted style={styles.caption}>
                                    All-time wins · Best streak and fewer attempts break ties.
                                </AppText>
                            </View>
                        }
                        ListEmptyComponent={
                            <StateView title="The leaderboard is waiting" message="Complete today's puzzle to get started."/>
                        }
                    />
                    {data.currentUserEntry &&
                        <View style={styles.personalDock}>
                            <View style={styles.personalCard}>
                                <Award size={23} color={colors.accent}/>
                                <View style={styles.identity}>
                                    <AppText style={styles.heading}>
                                        Your position
                                    </AppText>
                                    <AppText muted style={styles.caption}>{formatNumber(data.currentUserEntry.totalWon)} wins
                                        · {formatPercent(data.currentUserEntry.winRate, { fractionDigits: 0 })} win rate</AppText>
                                </View>
                                <AppText style={styles.personalRank}>#{data.currentUserEntry.rank}</AppText>
                            </View>
                        </View>
                    }
                </View>
            }
        </QueryPanel>
    );
}


export function MoviedleScreen() {
    const focused = useIsFocused();
    const [tab, setTab] = useState<"play" | "stats" | "leaderboard">("play");
    const [helpOpen, setHelpOpen] = useState(false);
    const query = useQuery({ ...moviedleOptions, enabled: focused });

    return (
        <Page
            title="Moviedle"
            brand
            back
            action={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="How to play Moviedle"
                    onPress={() => setHelpOpen(true)}
                    style={({ pressed }) => [styles.help, pressed && styles.pressed]}
                >
                    <Info size={22} color={colors.muted}/>
                </Pressable>
            }
        >
            <PagedTabs
                tabs={tabs}
                value={tab}
                onChange={setTab}
            >
                {value => value === "leaderboard"
                    ? <Leaderboard active={tab === "leaderboard"}/>
                    : <QueryPanel query={query}>
                        {data => value === "play"
                            ? <DailyGame
                                key={data.mediadleId}
                                data={data}
                                active={tab === "play"}
                                refreshing={query.isRefetching}
                                refetch={query.refetch}
                            />
                            : <GameStats data={data}/>
                        }
                    </QueryPanel>
                }
            </PagedTabs>
            {query.data &&
                <ResetCountdown resetsAt={query.data.resetsAt}/>
            }
            {helpOpen &&
                <ActionSheet
                    title="How to play"
                    dismiss={() => setHelpOpen(false)}
                >
                    <View style={styles.instructions}>
                        <Clapperboard size={30} color={mediaColors.movies}/>
                        <AppText heading style={styles.resultTitle}>
                            {query.data ? `One poster. ${query.data.maxAttempts} attempts.` : "One poster. One daily challenge."}
                        </AppText>
                        <AppText muted>
                            Identify the movie behind the pixelated poster. Tap Guess movie to search for a title, then submit your guess.
                        </AppText>
                        <AppText muted>
                            Each incorrect guess or skip uses one attempt and makes the poster a little clearer. Solve it before your attempts run out.
                        </AppText>
                        <AppText muted>
                            A new challenge arrives every day. Swipe between Play, Your stats and Leaderboard to see your record and compare with others.
                        </AppText>
                        <Button
                            fullWidth
                            label="Let's play"
                            onPress={() => setHelpOpen(false)}
                        />
                    </View>
                </ActionSheet>
            }
        </Page>
    );
}


const styles = StyleSheet.create({
    fill: { flex: 1 },
    inline: { flexDirection: "row", alignItems: "center", gap: 8 },
    identity: { flex: 1, minWidth: 0 },
    heading: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
    caption: { fontSize: 12, lineHeight: 18 },
    eyebrow: {
        fontSize: 10,
        lineHeight: 16,
        letterSpacing: 1.4,
        fontWeight: "600"
    },
    pressed: { opacity: 0.6 },
    help: {
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center"
    },
    gameContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 14
    },
    dailyHeading: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12
    },
    puzzleNumber: {
        fontSize: 12,
        lineHeight: 18,
        color: mediaColors.movies,
        fontVariant: ["tabular-nums"],
        fontWeight: "600"
    },
    posterArea: { flex: 1, minHeight: 180 },
    posterCenter: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    poster: { borderRadius: 14, borderWidth: 1, borderColor: colors.border },
    gameDock: { gap: 12 },
    attemptHeading: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8
    },
    attempts: { flexDirection: "row", gap: 8 },
    attempt: {
        flex: 1,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 7,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border
    },
    nextAttempt: { borderColor: mediaColors.movies, backgroundColor: `${mediaColors.movies}10` },
    attemptNumber: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: "600",
        fontVariant: ["tabular-nums"]
    },
    feedback: { fontSize: 12, lineHeight: 18, minHeight: 18 },
    actions: { flexDirection: "row", gap: 12 },
    skipAction: { flex: 1 },
    guessAction: { flex: 2 },
    result: {
        padding: 16,
        gap: 10,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border
    },
    resultHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
    resultTitle: { fontSize: 21, lineHeight: 28 },
    movieTitle: { fontSize: 16, lineHeight: 23, fontWeight: "600" },
    countdown: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border
    },
    timer: {
        fontSize: 12,
        fontVariant: ["tabular-nums"]
    },
    sheetContent: { gap: 12 },
    suggestionStatus: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12
    },
    suggestionsLabel: {
        fontSize: 10,
        lineHeight: 16,
        letterSpacing: 1,
        paddingVertical: 8
    },
    suggestion: {
        minHeight: 54,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    error: { fontSize: 12, lineHeight: 18, color: colors.error },
    instructions: { gap: 16 },
    statsContent: { padding: 20, paddingBottom: 28, gap: 16 },
    sectionTitle: { fontSize: 18, lineHeight: 25 },
    heroMetrics: { flexDirection: "row", gap: 12 },
    heroMetric: {
        flex: 1,
        minWidth: 0,
        padding: 18,
        gap: 8,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border
    },
    heroValue: {
        fontSize: 34,
        lineHeight: 42,
        fontWeight: "700",
        fontVariant: ["tabular-nums"]
    },
    metrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: 8
    },
    metric: { width: "50%", padding: 12, gap: 4 },
    metricValue: {
        fontSize: 22,
        lineHeight: 30,
        fontWeight: "600",
        fontVariant: ["tabular-nums"]
    },
    distributionCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6
    },
    distributionRows: { gap: 12, paddingTop: 12 },
    distributionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    distributionNumber: { width: 14, fontSize: 12, textAlign: "center" },
    barTrack: {
        flex: 1,
        height: 30,
        borderRadius: 7,
        overflow: "hidden",
        backgroundColor: colors.surface,
        justifyContent: "center"
    },
    barFill: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        backgroundColor: colors.primary,
        borderRadius: 7
    },
    barCount: {
        alignSelf: "flex-end",
        paddingHorizontal: 10,
        fontSize: 12,
        fontWeight: "600",
        fontVariant: ["tabular-nums"]
    },
    leaderContent: { paddingHorizontal: 16, paddingBottom: 24 },
    leaderHeading: { gap: 8, paddingTop: 20, paddingBottom: 18 },
    leader: {
        minHeight: 82,
        paddingVertical: 14,
        paddingHorizontal: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    ownLeader: { backgroundColor: `${colors.accent}10`, borderRadius: 12 },
    rank: {
        width: 24,
        textAlign: "center",
        fontSize: 13,
        fontWeight: "600",
        fontVariant: ["tabular-nums"]
    },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
    avatarInitial: { fontSize: 16, fontWeight: "600" },
    leaderCaption: { fontSize: 11, lineHeight: 17 },
    leaderScore: { alignItems: "flex-end" },
    wins: {
        fontSize: 23,
        lineHeight: 29,
        fontWeight: "700",
        fontVariant: ["tabular-nums"]
    },
    personalDock: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    personalCard: {
        padding: 14,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: `${colors.accent}0D`,
        flexDirection: "row",
        alignItems: "center",
        gap: 12
    },
    personalRank: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: "700",
        color: colors.accent,
        fontVariant: ["tabular-nums"]
    },
});
