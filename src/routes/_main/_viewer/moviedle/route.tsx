import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {PageHeader} from "@/lib/client/components/general/PageHeader";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {CountdownTimer} from "@/lib/client/components/moviedle/CountdownTimer";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {MediadleLeaderboard} from "@/lib/client/components/moviedle/MediadleLeaderboard";
import {useMoviedleGuessMutation} from "@/lib/client/react-query/query-mutations/mediadle.mutations";
import {dailyMediadleOptions, mediadleLeaderboardOptions, mediadleSuggestionsOptions} from "@/lib/client/react-query/query-options";
import {Award, ChartNoAxesColumnIncreasing, Check, Clapperboard, Clock3, Flame, Gauge, PartyPopper, SkipForward, Target, ThumbsDown, Trophy} from "lucide-react";


// Explicit constant for skipped guesses (lol c'est sale)
const SKIP_VAL = "rtehsqqt";


export const Route = createFileRoute("/_main/_viewer/moviedle")({
    context: () => ({
        dailyMediadleQueryOptions: dailyMediadleOptions,
        mediadleLeaderboardQueryOptions: mediadleLeaderboardOptions,
    }),
    loader: ({ context }) => Promise.all([
        context.queryClient.ensureQueryData(context.dailyMediadleQueryOptions),
        context.queryClient.ensureQueryData(context.mediadleLeaderboardQueryOptions),
    ]),
    component: MediadlePage,
});


function MediadlePage() {
    const { dailyMediadleQueryOptions, mediadleLeaderboardQueryOptions } = Route.useRouteContext();

    const { currentUser, isAnonymous } = useAuth();
    const makeGuessMutation = useMoviedleGuessMutation();
    const leaderboard = useSuspenseQuery(mediadleLeaderboardQueryOptions).data;
    const { userData, ...mediadleData } = useSuspenseQuery(dailyMediadleQueryOptions).data;
    const { search, setSearch, selectValue, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer();

    const { data: suggestions = [], isLoading, error } = useQuery(mediadleSuggestionsOptions(debouncedSearch));
    const coverSrc = mediadleData.result?.nonPixelatedCover ?? `data:image/png;base64,${mediadleData.pixelatedCover}`;

    const handleSearchClick = (input: string) => {
        selectValue(input);
    };

    const handleMutation = (guessValue: string) => {
        makeGuessMutation.mutate({ data: { guess: guessValue } }, {
            onSuccess: () => reset(),
        });
    };

    const onGuessClick = () => {
        const guess = search.trim();
        if (!guess) return;
        handleMutation(guess);
    };

    const onSkipClick = () => {
        handleMutation(SKIP_VAL);
    };

    return (
        <PageTitle title="Moviedle" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <PageHeader
                    title="Moviedle"
                    asideIcon={Clock3}
                    eyebrowIcon={Clapperboard}
                    asideLabel="Next cover in"
                    eyebrowClassName="text-movies"
                    asideValue={<CountdownTimer/>}
                    eyebrow="Daily movie challenge"
                    description={`One poster. ${mediadleData.maxAttempts} attempts. A new film every day.`}
                />

                <section className="grid grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] items-stretch gap-10 pt-8 max-lg:grid-cols-1">
                    <div className="flex min-w-0 flex-col items-center">
                        <span className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                            Daily cover · No. {String(mediadleData.mediadleId).padStart(4, "0")}
                        </span>
                        <figure className="relative w-full max-w-86 px-8">
                            <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-foreground/10">
                                <div className="aspect-2/3 overflow-hidden bg-muted">
                                    {mediadleData.result ?
                                        <Link
                                            className="block size-full"
                                            to="/details/$mediaType/$mediaId"
                                            params={{ mediaType: MediaType.MOVIES, mediaId: mediadleData.result.mediaId }}
                                        >
                                            <img
                                                src={coverSrc}
                                                alt="Movie Cover"
                                                className="size-full object-cover transition-transform duration-500 hover:scale-[1.025]"
                                            />
                                        </Link>
                                        :
                                        <img
                                            src={coverSrc}
                                            alt="Movie Cover"
                                            className="size-full object-cover"
                                        />
                                    }
                                </div>
                            </div>
                        </figure>

                        <div className="mt-6 flex w-full max-w-lg flex-col gap-6">
                            <div>
                                {isAnonymous ?
                                    <div className="w-full">
                                        <LockedContent
                                            variant="inline"
                                            isAnonymous={isAnonymous}
                                            title="Sign in to play today's Mediadle"
                                            description="Track your daily streak, compare global stats, and show off your movie knowledge."
                                        />
                                    </div>
                                    :
                                    (userData && userData.completed) ?
                                        <div className={cn(
                                            "animate-fade-up flex max-w-2xl items-start gap-4 rounded-xl border px-4 py-3",
                                            userData.succeeded
                                                ? "border-success/30 bg-success/5"
                                                : "border-destructive/30 bg-destructive/5",
                                        )}>
                                            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full",
                                                userData.succeeded ? "bg-success/15" : "bg-destructive/10")}>
                                                {userData.succeeded
                                                    ? <PartyPopper className="size-5 text-success"/>
                                                    : <ThumbsDown className="size-5 text-destructive"/>
                                                }
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">
                                                    {userData.succeeded ? "That's a wrap!" : "End credits"}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {userData.succeeded
                                                        ? `You found it in ${userData.attempts} ${userData.attempts === 1 ? "try" : "tries"}.`
                                                        : "The film got away. A new cover arrives tomorrow."
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        :
                                        <div ref={containerRef} className="flex w-full flex-col gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    <span>Attempts</span>
                                                    <span>{userData?.attempts ?? 0} / {mediadleData.maxAttempts}</span>
                                                </div>
                                                <div className="flex h-1.5 gap-1.5" aria-hidden="true">
                                                    {Array.from({ length: mediadleData.maxAttempts }).map((_, idx) => {
                                                        const isUsed = idx < (userData?.attempts ?? 0);
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={cn(
                                                                    "flex-1 rounded-full bg-muted transition-colors duration-300",
                                                                    isUsed && "bg-destructive",
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <SearchInput
                                                    value={search}
                                                    placeholder="Search for a film..."
                                                    onChange={(ev) => setSearch(ev.target.value)}
                                                />
                                                <SearchContainer
                                                    error={error}
                                                    position="top"
                                                    search={search}
                                                    isOpen={isOpen}
                                                    minSearchLength={1}
                                                    isPending={isLoading}
                                                    debouncedSearch={debouncedSearch}
                                                    hasResults={!!suggestions?.length}
                                                >
                                                    <div className="flex max-h-60 flex-col overflow-y-auto scrollbar-thin">
                                                        {suggestions?.map((item) =>
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => handleSearchClick(item.name)}
                                                                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent"
                                                            >
                                                                <ProfileIcon
                                                                    fallbackSize="text-xs"
                                                                    className="size-9 border"
                                                                    user={{ image: null, name: item.name! }}
                                                                />
                                                                <span className="text-left text-sm font-medium">
                                                                    {item.name}
                                                                </span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </SearchContainer>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button className="flex-1" variant="secondary" onClick={onSkipClick}>
                                                    <SkipForward className="size-3.5" data-icon="inline-start"/>
                                                    Skip
                                                </Button>
                                                <Button className="flex-2" onClick={onGuessClick} disabled={!search.trim()}>
                                                    <Check data-icon="inline-start"/>
                                                    Submit guess
                                                </Button>
                                            </div>
                                        </div>
                                }
                            </div>
                        </div>
                    </div>

                    <UserStats
                        userData={userData}
                        isAnonymous={isAnonymous}
                    />
                </section>

                <MediadleLeaderboard
                    leaderboard={leaderboard}
                    currentUserId={currentUser?.id}
                />
            </div>
        </PageTitle>
    );
}


interface UserStatsProps {
    isAnonymous: boolean;
    userData: Awaited<ReturnType<typeof dailyMediadleOptions.queryFn & {}>>["userData"];
}


function UserStats({ userData, isAnonymous }: UserStatsProps) {
    const attemptsData = userData?.stats?.attempts ?? [];
    const frequencyMap = attemptsData.reduce<Record<number, number>>((acc, curr) => {
        acc[curr.attempts] = (acc[curr.attempts] || 0) + 1;
        return acc;
    }, {});

    const frequencies = Object.values(frequencyMap);
    const maxFreq = frequencies.length > 0 ? Math.max(...frequencies) : 0;

    return (
        <section className="relative h-fit overflow-hidden rounded-xl border shadow-xs">
            <LockedContent
                showAuthButtons={true}
                title="Statistics locked"
                isAnonymous={isAnonymous}
                description="Sign in to keep your game history, streaks, and win rate."
            />
            <div className={cn("flex flex-col transition-all", isAnonymous && "pointer-events-none select-none blur-xs")}>
                <div className="p-5 pb-7 sm:p-6 sm:pb-8">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true"/>
                        Your record
                    </div>
                    <div className="mt-7">
                        <CompactStatsGrid
                            columns={3}
                            items={[
                                {
                                    label: "Played all time",
                                    icon: <Clapperboard className="size-4"/>,
                                    value: formatNumber(userData?.stats?.totalPlayed ?? 0),
                                },
                                {
                                    label: "Won all time",
                                    icon: <Trophy className="size-4"/>,
                                    value: formatNumber(userData?.stats?.totalWon ?? 0),
                                },
                                {
                                    label: "Win rate",
                                    icon: <Target className="size-4"/>,
                                    value: formatPercent(userData?.stats?.winRate ?? 0),
                                },
                                {
                                    label: "Current streak",
                                    icon: <Flame className="size-4"/>,
                                    value: formatNumber(userData?.stats?.currentStreak ?? 0),
                                },
                                {
                                    label: "Best streak",
                                    icon: <Award className="size-4"/>,
                                    value: formatNumber(userData?.stats?.bestStreak ?? 0),
                                },
                                {
                                    label: "Avg. attempts",
                                    icon: <Gauge className="size-4"/>,
                                    value: formatNumber(userData?.stats?.averageAttempts ?? 0, {
                                        fractionDigits: 2,
                                        locale: "en",
                                    }),
                                },
                            ]}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-5 border-t p-5 sm:p-6">
                    <div className="flex items-end justify-between gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Guess distribution
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            Wins by attempt
                        </span>
                    </div>
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4, 5].map((num) => {
                            const count = frequencyMap[num] ?? 0;
                            const percentage = maxFreq > 0 ? (count / maxFreq) * 100 * 0.92 : 0;

                            return (
                                <div key={num} className="flex items-center gap-3 text-sm">
                                    <span className="w-2 font-mono text-xs text-muted-foreground">{num}</span>
                                    <div className="relative flex h-7 flex-1 items-center overflow-hidden rounded-md bg-muted/50 ring-1 ring-foreground/5">
                                        <div
                                            style={{ width: `${Math.max(percentage, 8)}%` }}
                                            className="h-full rounded-r-md bg-primary transition-all duration-500"
                                        />
                                        <span className="absolute right-2 font-mono text-xs font-semibold tabular-nums text-foreground">
                                            {count}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
