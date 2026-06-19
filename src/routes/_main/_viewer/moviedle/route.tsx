import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {PartyPopper, ThumbsDown} from "lucide-react";
import {Button} from "@/lib/client/components/ui/button";
import {createFileRoute, Link} from "@tanstack/react-router";
import {useQuery, useSuspenseQuery} from "@tanstack/react-query";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {ProfileIcon} from "@/lib/client/components/general/ProfileIcon";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {LockedContent} from "@/lib/client/components/general/LockedContent";
import {CountdownTimer} from "@/lib/client/components/moviedle/CountdownTimer";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {SimpleStatCard} from "@/lib/client/components/user-profile/SimpleStatCard";
import {Card, CardContent, CardHeader, CardTitle,} from "@/lib/client/components/ui/card";
import {useMoviedleGuessMutation} from "@/lib/client/react-query/query-mutations/mediadle.mutations";
import {dailyMediadleOptions, mediadleSuggestionsOptions,} from "@/lib/client/react-query/query-options";


// Explicit constant for skipped guesses (lol c'est sale)
const SKIP_VAL = "rtehsqqt";


export const Route = createFileRoute("/_main/_viewer/moviedle")({
    loader: async ({ context: { queryClient } }) => {
        return queryClient.ensureQueryData(dailyMediadleOptions);
    },
    component: MediadlePage,
});


function MediadlePage() {
    const { isAnonymous } = useAuth();
    const makeGuessMutation = useMoviedleGuessMutation();
    const { userData, ...mediadleData } = useSuspenseQuery(dailyMediadleOptions).data;
    const { search, setSearch, selectValue, debouncedSearch, isOpen, reset, containerRef } = useSearchContainer();
    const { data: suggestions = [], isLoading, error } = useQuery(mediadleSuggestionsOptions(debouncedSearch));

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
        <PageTitle title="Daily Movie Challenge" subtitle="Play the daily movie game to check your skills!">
            <div className="grid gap-6 grid-cols-2 mt-6 max-lg:grid-cols-1">
                <Card className="flex flex-col justify-between">
                    <CardHeader className="space-y-4 pb-4">
                        <div className="flex items-center justify-center gap-2">
                            <CardTitle>Next game in</CardTitle>
                            <CountdownTimer/>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center">
                        <div className="space-y-4 w-full">
                            <div className="relative aspect-2/3 max-w-75 mx-auto">
                                {mediadleData.result ?
                                    <Link
                                        to="/details/$mediaType/$mediaId"
                                        params={{ mediaType: MediaType.MOVIES, mediaId: mediadleData.result.mediaId }}
                                    >
                                        <img
                                            alt="Movie Cover"
                                            src={mediadleData.result.nonPixelatedCover}
                                            className="w-full h-full object-cover rounded-lg transition-transform hover:scale-[1.02]"
                                        />
                                    </Link>
                                    :
                                    <img
                                        alt="Movie Cover"
                                        className="w-full h-full object-cover rounded-lg"
                                        src={`data:image/png;base64,${mediadleData.pixelatedCover}`}
                                    />
                                }
                            </div>
                            {isAnonymous ?
                                <LockedContent
                                    className="relative"
                                    isAnonymous={isAnonymous}
                                    title="Sign in to join the moviedle game!"
                                    description="Track your daily streak, compare global stats, and show off your movie knowledge."
                                />
                                :
                                (userData && userData.completed) ?
                                    <div className="animate-fade-up rounded-lg bg-popover text-center p-4 max-w-100 mx-auto mb-8 border">
                                        {userData.succeeded
                                            ? <PartyPopper className="size-6 text-app-rating mx-auto mb-1"/>
                                            : <ThumbsDown className="size-6 text-destructive mx-auto mb-1"/>
                                        }
                                        <h3 className="font-semibold">
                                            {userData.succeeded ? "Congratulations!" : "Game Over :("}
                                        </h3>
                                        <p className="text-sm text-neutral-300">
                                            {userData.succeeded
                                                ? `You got it in ${userData.attempts} ${userData.attempts === 1 ? "try" : "tries"}!`
                                                : "Better luck tomorrow!"
                                            }
                                        </p>
                                    </div>
                                    :
                                    <div ref={containerRef} className="max-w-100 mx-auto mb-8">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs font-medium uppercase text-muted-foreground">
                                                    <span>Attempts</span>
                                                    <span>{userData?.attempts ?? 0} / {mediadleData.maxAttempts}</span>
                                                </div>
                                                <div className="flex gap-1.5 h-2">
                                                    {Array.from({ length: mediadleData.maxAttempts }).map((_, idx) => {
                                                        const isUsed = idx < (userData?.attempts ?? 0);
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={cn("flex-1 rounded-sm bg-muted-foreground/30 " +
                                                                    "transition-colors duration-300", isUsed && "bg-destructive",
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <SearchInput
                                                    value={search}
                                                    className="max-w-100"
                                                    placeholder="Search a movie..."
                                                    onChange={(ev) => setSearch(ev.target.value)}
                                                />
                                                <SearchContainer
                                                    error={error}
                                                    position="top"
                                                    search={search}
                                                    isOpen={isOpen}
                                                    minSearchLength={1}
                                                    isPending={isLoading}
                                                    className={"max-w-100"}
                                                    debouncedSearch={debouncedSearch}
                                                    hasResults={!!suggestions?.length}
                                                >
                                                    <div className="flex flex-col overflow-y-auto scrollbar-thin max-h-60">
                                                        {suggestions?.map((item, idx) =>
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => handleSearchClick(item.name)}
                                                                className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors"
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
                                                <Button className="flex-1" variant="emeraldy" onClick={onSkipClick}>
                                                    Skip
                                                </Button>
                                                <Button className="flex-2" onClick={onGuessClick} disabled={!search.trim()}>
                                                    Submit Guess
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                            }
                        </div>
                    </CardContent>
                </Card>

                <UserStats
                    userData={userData}
                    isAnonymous={isAnonymous}
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
        <div className="relative space-y-6">
            <LockedContent
                showAuthButtons={true}
                title="Statistics Locked"
                isAnonymous={isAnonymous}
                description="Sign in to keep a dynamic record of your game history, custom streaks, and win rate."
            />
            <div className={cn("grid gap-2 grid-cols-3 max-sm:grid-cols-2 transition-all",
                isAnonymous && "blur-xs pointer-events-none select-none")}>
                <SimpleStatCard
                    title="Total Played"
                    value={userData?.stats?.totalPlayed ?? 0}
                />
                <SimpleStatCard
                    title="Total Won"
                    value={userData?.stats?.totalWon ?? 0}
                />
                <SimpleStatCard
                    title="Win Rate"
                    value={formatPercent(userData?.stats?.winRate ?? 0)}
                />
                <SimpleStatCard
                    title="Current Streak"
                    value={userData?.stats?.currentStreak ?? 0}
                />
                <SimpleStatCard
                    title="Best Streak"
                    value={userData?.stats?.bestStreak ?? 0}
                />
                <SimpleStatCard
                    title="Avg. Attempts"
                    value={formatNumber(userData?.stats?.averageAttempts ?? 0, { fractionDigits: 2, locale: "en" })}
                />
            </div>

            <div className={cn("mb-10 transition-all", isAnonymous && "blur-xs pointer-events-none select-none")}>
                <h4 className="text-sm font-semibold text-primary mb-3">
                    Guess Distribution
                </h4>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((num) => {
                        const count = frequencyMap[num] ?? 0;
                        const percentage = maxFreq > 0 ? (count / maxFreq) * 100 * 0.92 : 0;

                        return (
                            <div key={num} className="flex items-center gap-3 text-sm">
                                <span className="w-2 font-mono text-primary">{num}</span>
                                <div className="flex-1 h-6 bg-popover rounded-r-md overflow-hidden flex items-center border border-border/40">
                                    <div
                                        style={{ width: `${Math.max(percentage, 8)}%` }}
                                        className="h-full transition-all duration-500 bg-app-accent/50 rounded-r-md"
                                    />
                                    <span className="ml-2 text-xs font-bold text-primary">
                                        {count}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
