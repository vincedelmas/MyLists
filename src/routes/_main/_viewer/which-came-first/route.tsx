import {useEffect, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {Progress} from "@/lib/client/components/ui/progress";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {WCF_MAX_ROUNDS, WCF_MEDIA_TYPES} from "@/lib/schemas/wcf.schema";
import {formatNumber, formatPercent} from "@/lib/utils/number-formatting";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {ToggleGroup, ToggleGroupItem} from "@/lib/client/components/ui/toggle-group";
import {dateFromUTCInput, extractDate, formatDate} from "@/lib/utils/date-formatting";
import {CompactStatsGrid} from "@/lib/client/components/media-stats/CompactStatsGrid";
import {WcfLeaderboard} from "@/lib/client/components/which-came-first/WcfLeaderboard";
import {whichCameFirstOptions} from "@/lib/client/react-query/query-options/wcf.options";
import {MediaCardRightCorner, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {useAbandonWCFRunMutation, useAnswerWCFRoundMutation, useResetWCFStatsMutation, useStartWCFRunMutation} from "@/lib/client/react-query/query-mutations/wcf.mutations";
import {
    ArrowRight,
    CalendarClock,
    ChartNoAxesColumnIncreasing,
    Check,
    ChevronRight,
    Gauge,
    GitCompareArrows,
    House,
    Layers3,
    RotateCcw,
    Target,
    Trash2,
    Trophy,
    X
} from "lucide-react";


export const Route = createFileRoute("/_main/_viewer/which-came-first")({
    context: () => ({
        whichCameFirstQueryOptions: whichCameFirstOptions,
    }),
    loader: ({ context }) => {
        return context.queryClient.ensureQueryData(context.whichCameFirstQueryOptions);
    },
    component: WhichCameFirstPage,
});


type AnswerResult = NonNullable<ReturnType<typeof useAnswerWCFRoundMutation>["data"]>;
type ActiveRunData = NonNullable<NonNullable<Awaited<ReturnType<NonNullable<typeof whichCameFirstOptions.queryFn>>>>["activeRun"]>;


function WhichCameFirstPage() {
    const queryClient = useQueryClient();
    const startMutation = useStartWCFRunMutation();
    const answerMutation = useAnswerWCFRoundMutation();
    const abandonMutation = useAbandonWCFRunMutation();
    const { whichCameFirstQueryOptions } = Route.useRouteContext();
    const [showGameOver, setShowGameOver] = useState(false);
    const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
    const { activeRun, leaderboard, stats } = useSuspenseQuery(whichCameFirstQueryOptions).data;
    const [selectedTypes, setSelectedTypes] = useState<MediaType[]>(activeRun?.selectedMediaTypes ?? [...WCF_MEDIA_TYPES]);

    const submitAnswer = (selectedSide: "left" | "right") => {
        if (!activeRun || answerResult || answerMutation.isPending) return;

        answerMutation.mutate({
            data: {
                selectedSide,
                runId: activeRun.id,
                roundId: activeRun.round.id,
            },
        }, {
            onSuccess: (result) => setAnswerResult(result),
        });
    };

    const continueGame = async () => {
        await queryClient.invalidateQueries({ queryKey: whichCameFirstQueryOptions.queryKey });
        setAnswerResult(null);
        setShowGameOver(false);
    };

    const startGame = () => {
        setAnswerResult(null);
        setShowGameOver(false);
        startMutation.mutate({ data: { mediaTypes: selectedTypes } });
    };

    const playAgain = () => {
        startMutation.mutate({ data: { mediaTypes: selectedTypes } }, {
            onSuccess: () => {
                setAnswerResult(null);
                setShowGameOver(false);
            },
        });
    };

    useEffect(() => {
        if (!answerResult?.correct || answerResult.runEnded) return;

        const timeout = window.setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: whichCameFirstQueryOptions.queryKey })
                .then(() => setAnswerResult(null));
        }, 1400);

        return () => window.clearTimeout(timeout);
    }, [answerResult, queryClient, whichCameFirstQueryOptions]);

    useEffect(() => {
        if (!answerResult?.runEnded) return;

        const timeout = window.setTimeout(() => setShowGameOver(true), 1500);
        return () => window.clearTimeout(timeout);
    }, [answerResult]);

    return (
        <PageTitle title="Which Came First?" onlyHelmet>
            <div className="mb-8 flex flex-col pt-8">
                <header className="flex items-end justify-between gap-8 border-b pb-6 max-sm:flex-col max-sm:items-start">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                            <GitCompareArrows className="size-4" aria-hidden="true"/>
                            Release date challenge
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Which Came First?
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Two covers. Pick the title released first. One mistake ends the run.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 max-sm:items-start">
                        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            Run limit
                        </span>
                        <div className="flex items-center gap-2 text-lg">
                            <Target className="size-4 text-muted-foreground" aria-hidden="true"/>
                            Up to {WCF_MAX_ROUNDS} rounds
                        </div>
                    </div>
                </header>

                <section className="grid grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] items-stretch gap-10 pt-8 max-lg:grid-cols-1">
                    <div className="min-w-0">
                        {activeRun && showGameOver && answerResult ?
                            <GameOverScreen
                                run={activeRun}
                                result={answerResult}
                                onMainMenu={continueGame}
                                onPlayAgain={playAgain}
                                isStarting={startMutation.isPending}
                            />
                            : activeRun ?
                                <GameBoard
                                    run={activeRun}
                                    result={answerResult}
                                    onAnswer={submitAnswer}
                                    isPending={answerMutation.isPending}
                                    onAbandon={() => abandonMutation.mutate({ data: { runId: activeRun.id } })}
                                />
                                :
                                <GameSetup
                                    onStart={startGame}
                                    selectedTypes={selectedTypes}
                                    onSelectionChange={setSelectedTypes}
                                    isPending={startMutation.isPending}
                                />
                        }
                    </div>
                    <Stats
                        stats={stats}
                        canReset={!activeRun && !answerResult}
                    />
                </section>

                <WcfLeaderboard
                    leaderboard={leaderboard}
                />
            </div>
        </PageTitle>
    );
}


interface GameSetupProps {
    isPending: boolean;
    onStart: () => void;
    selectedTypes: MediaType[];
    onSelectionChange: (types: MediaType[]) => void;
}


function GameSetup({ selectedTypes, onSelectionChange, isPending, onStart }: GameSetupProps) {
    return (
        <section className="flex h-full flex-col">
            <div className="mb-7">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <CalendarClock className="size-4" aria-hidden="true"/>
                    Build your run
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    Choose your media pool
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Pick the categories you know best. Every round draws two titles from this pool.
                </p>
            </div>

            <ToggleGroup
                multiple
                spacing={0}
                variant="brand"
                orientation="vertical"
                value={selectedTypes}
                aria-label="Media pool"
                className="w-full items-stretch border-y"
                onValueChange={(types) => onSelectionChange(types as MediaType[])}
            >
                {WCF_MEDIA_TYPES.map((mediaType) => {
                    const selected = selectedTypes.includes(mediaType);

                    return (
                        <ToggleGroupItem
                            key={mediaType}
                            value={mediaType}
                            aria-label={`${selected ? "Remove" : "Add"} ${mediaType}`}
                            className="group h-14 w-full shrink justify-between rounded-none border-x-0 border-t-0 px-1 last:border-b-0"
                        >
                            <span className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center text-muted-foreground group-aria-pressed:text-brand">
                                    <MainThemeIcon size={19} type={mediaType}/>
                                </span>
                                <span className="font-semibold capitalize">
                                    {mediaType}
                                </span>
                            </span>
                            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                {selected ? "In pool" : "Add"}
                                {selected && <Check aria-hidden="true"/>}
                            </span>
                        </ToggleGroupItem>
                    );
                })}
            </ToggleGroup>

            <div className="mt-6 flex items-center justify-between gap-5 border-b pb-6 max-sm:flex-col max-sm:items-stretch">
                <div className="flex items-baseline gap-2">
                    <strong className="font-mono text-3xl font-semibold leading-none tabular-nums text-foreground">
                        {selectedTypes.length}
                    </strong>
                    <span className="text-sm text-muted-foreground">
                        {selectedTypes.length === 1 ? "category selected" : "categories selected"}
                    </span>
                </div>
                <div className="flex items-center gap-2 max-sm:w-full">
                    <Button
                        variant="ghost"
                        onClick={() => onSelectionChange(selectedTypes.length === WCF_MEDIA_TYPES.length ? [] : [...WCF_MEDIA_TYPES])}
                    >
                        {selectedTypes.length === WCF_MEDIA_TYPES.length ? "Clear" : "Select all"}
                    </Button>
                    <Button
                        size="lg"
                        onClick={onStart}
                        disabled={selectedTypes.length === 0 || isPending}
                        className="max-sm:flex-1"
                    >
                        Start the run
                        <ArrowRight data-icon="inline-end"/>
                    </Button>
                </div>
            </div>

            {selectedTypes.length === 0 &&
                <p className="mt-3 text-xs text-muted-foreground">
                    Choose at least one category to start.
                </p>
            }
        </section>
    );
}


interface GameBoardProps {
    isPending: boolean;
    run: ActiveRunData;
    onAbandon: () => void;
    result: AnswerResult | null;
    onAnswer: (side: "left" | "right") => void;
}


function GameBoard({ run, result, isPending, onAnswer, onAbandon }: GameBoardProps) {
    const displayedScore = result?.score ?? run.score;

    return (
        <section className="flex h-full flex-col">
            <div className="flex items-end justify-between gap-5 border-b pb-5 max-sm:flex-col max-sm:items-stretch">
                <div className="flex items-end gap-6">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Score
                        </p>
                        <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums">
                            {displayedScore}
                        </p>
                    </div>
                    <div className="border-l pl-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Round
                        </p>
                        <p className="mt-1 font-mono text-2xl font-semibold leading-none tabular-nums">
                            {run.round.number} / {WCF_MAX_ROUNDS}
                        </p>
                    </div>
                    <Badge variant="outline">
                        <Gauge/> {run.round.difficulty} apart
                    </Badge>
                </div>
                {!result &&
                    <Button
                        aria-label="End run"
                        className="max-sm:self-end"
                        variant="destructiveGhost"
                        onClick={onAbandon}
                    >
                        <X data-icon="inline-start"/>
                        <span className="max-sm:hidden">End run</span>
                    </Button>
                }
            </div>

            <div className="relative mt-6 grid w-full grid-cols-2 gap-3 sm:gap-6">
                <MediaCard
                    side="left"
                    result={result}
                    onSelect={onAnswer}
                    card={run.round.left}
                    disabled={isPending || !!result}
                />
                <div className="absolute left-1/2 top-1/2 z-20 flex size-10 -translate-x-1/2 -translate-y-1/2
                    items-center justify-center rounded-full border-2 border-background bg-primary font-mono text-[10px]
                    font-semibold tracking-[0.12em] text-primary-foreground shadow-lg max-sm:size-8"
                >
                    VS
                </div>
                <MediaCard
                    side="right"
                    result={result}
                    onSelect={onAnswer}
                    card={run.round.right}
                    disabled={isPending || !!result}
                />
            </div>

            <div className="mt-5 min-h-16 border-b pb-5 text-center" aria-live="polite">
                {!result ?
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-brand"/>
                        Select the title that was released first
                    </div>
                    :
                    result.correct ?
                        <div className="animate-in fade-in">
                            <p className="font-semibold text-brand">
                                {result.won ? "Round 30 complete"
                                    : result.poolExhausted ? "No new matchups remain"
                                        : "Correct — keep going"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {result.runEnded ? "Revealing your run result…" : "Next matchup loading…"}
                            </p>
                        </div>
                        :
                        <div className="animate-in fade-in">
                            <p className="font-semibold text-destructive">
                                That one came later
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Revealing your run result…
                            </p>
                        </div>
                }
            </div>
        </section>
    );
}


interface GameOverScreenProps {
    run: ActiveRunData;
    isStarting: boolean;
    result: AnswerResult;
    onMainMenu: () => void;
    onPlayAgain: () => void;
}


function GameOverScreen({ run, result, isStarting, onMainMenu, onPlayAgain }: GameOverScreenProps) {
    const completedWithoutLoss = result.won || result.poolExhausted;
    const roundsAnswered = result.correct ? result.score : result.score + 1;
    const verdict = result.poolExhausted
        ? "Your selected pool has no unseen pairings left in the required difficulty range."
        : getRunVerdict(result.score);

    return (
        <section className="animate-in fade-in zoom-in-95 duration-300">
            <div className="border-b pb-7">
                <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]",
                    completedWithoutLoss ? "text-brand" : "text-destructive")}>
                    {completedWithoutLoss ? <Trophy className="size-4"/> : <X className="size-4"/>}
                    {result.won ? "Run won" : result.poolExhausted ? "Pool exhausted" : "Run complete"}
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                    {result.won ? `You cleared all ${WCF_MAX_ROUNDS} rounds`
                        : result.poolExhausted ? `You cleared ${result.score} rounds`
                            : `You scored ${result.score}`}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {verdict}
                </p>
            </div>

            <div className="border-b py-7">
                <CompactStatsGrid
                    color={completedWithoutLoss ? "var(--brand)" : "var(--destructive)"}
                    columns={3}
                    items={[
                        {
                            label: "Correct",
                            note: "right answers",
                            icon: <Check className="size-4"/>,
                            value: formatNumber(result.score),
                        },
                        {
                            label: "Rounds",
                            note: `of ${WCF_MAX_ROUNDS}`,
                            icon: <Layers3 className="size-4"/>,
                            value: formatNumber(roundsAnswered),
                        },
                        {
                            label: "Difficulty",
                            note: "final tier",
                            icon: <Gauge className="size-4"/>,
                            value: run.round.difficulty,
                        },
                    ]}
                />
            </div>

            <div className="flex items-end justify-between gap-6 pt-6 max-sm:flex-col max-sm:items-stretch">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your media pool
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {run.selectedMediaTypes.map((mediaType) =>
                            <Badge key={mediaType} variant="outline" className="capitalize">
                                <MainThemeIcon type={mediaType}/>
                                {mediaType}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" disabled={isStarting} onClick={onMainMenu}>
                        <House data-icon="inline-start"/>
                        Main menu
                    </Button>
                    <Button disabled={isStarting} onClick={onPlayAgain}>
                        <RotateCcw data-icon="inline-start"/>
                        Play again
                    </Button>
                </div>
            </div>
        </section>
    );
}


const getRunVerdict = (score: number) => {
    if (score >= 30) return "Are you Googling these? Be honest. Because that score is ridiculous. Perfect run!";
    if (score === 0) return "Not even a lucky guess? Rough...";
    if (score <= 3) return "A bit all over the place, but hey, you got a few right :).";
    if (score <= 7) return "Not bad at all. You know the general eras.";
    if (score <= 12) return "Nice! You clearly know your pop culture.";
    if (score <= 20) return "Damn, okay! Your memory is kind of terrifying. That was a massive run.";
    return "I don't believe you, you did not cheat?? Incredible run!";
};


interface MediaCardProps {
    disabled: boolean;
    side: "left" | "right";
    result: AnswerResult | null;
    onSelect: (side: "left" | "right") => void;
    card: { name: string; imageCover: string; mediaType: MediaType };
}


function MediaCard({ side, card, result, disabled, onSelect }: MediaCardProps) {
    const state: "neutral" | "correct" | "incorrect" = !result
        ? "neutral" : side === result.correctSide
            ? "correct" : side === result.selectedSide
                ? "incorrect" : "neutral";

    const releaseDate = result ? side === "left" ? result.leftReleaseDate : result.rightReleaseDate : null;
    const otherReleaseDate = result ? side === "left" ? result.rightReleaseDate : result.leftReleaseDate : null;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(side)}
            className={cn(
                "@container/media-card group relative aspect-2/3 overflow-hidden rounded-lg border bg-card text-left text-white",
                "shadow-2xl ring-1 transition-all duration-300 disabled:pointer-events-none",
                state === "correct" && "border-success shadow-success/20 ring-success/40",
                state === "incorrect" && "animate-wcf-shake border-destructive shadow-destructive/20 ring-destructive/40",
                !!result && state === "neutral" && "opacity-55 grayscale-35",
                !result && "border-transparent ring-foreground/10 hover:ring-brand/60",
            )}
        >
            <div className="absolute inset-0 overflow-hidden bg-muted">
                <img
                    src={card.imageCover}
                    alt={`${card.name} cover`}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                />
            </div>

            <div className="absolute inset-0 bg-linear-to-t from-black via-black/10 to-black/15"/>

            {state !== "neutral" &&
                <MediaCardRightCorner>
                    <div className={cn(
                        "flex size-7 animate-in zoom-in-75 items-center justify-center rounded-full shadow-lg max-sm:size-8",
                        state === "correct"
                            ? "bg-primary text-primary-foreground"
                            : "bg-destructive text-destructive-foreground",
                    )}>
                        {state === "correct" ? <Check/> : <X/>}
                    </div>
                </MediaCardRightCorner>
            }
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5
                @min-[200px]/media-card:gap-3 @min-[200px]/media-card:p-3 @min-[250px]/media-card:p-4">
                <div className="min-w-0">
                    <MediaCardTitle lines={2}>
                        {card.name}
                    </MediaCardTitle>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
                        <MediaTypeIcon mediaType={card.mediaType} size={14}/>
                        <span>Release date</span>
                    </div>
                </div>
                <strong className={cn("shrink-0 text-right text-2xl leading-none sm:text-3xl", !releaseDate && "text-white/35")}>
                    {releaseDate ? formatComparisonDate(releaseDate, otherReleaseDate!) : "?"}
                </strong>
            </div>
        </button>
    );
}


const monthYearFormatter = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC", year: "numeric" });


const formatComparisonDate = (date: string, otherDate: string) => {
    const current = extractDate(date);
    const other = extractDate(otherDate);

    if (current.year !== other.year) return current.year;
    if (current.month !== other.month) return monthYearFormatter.format(dateFromUTCInput(date));

    return formatDate(date);
};


interface StatsProps {
    canReset: boolean;
    stats: Awaited<ReturnType<NonNullable<typeof whichCameFirstOptions.queryFn>>>["stats"];
}


function Stats({ stats, canReset }: StatsProps) {
    const resetStatsMutation = useResetWCFStatsMutation();
    const hasStats = stats.runsPlayed > 0 || stats.totalAnswers > 0;
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const resetStats = () => {
        resetStatsMutation.mutate(undefined, {
            onSuccess: () => {
                setResetDialogOpen(false);
            },
        });
    };

    return (
        <section className="relative h-full">
            <div className="px-6 py-9 max-sm:px-0">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <ChartNoAxesColumnIncreasing className="size-4" aria-hidden="true"/>
                        Your record
                    </div>
                    <Button
                        aria-label="Reset statistics"
                        size="sm"
                        variant="destructiveGhost"
                        onClick={() => setResetDialogOpen(true)}
                        disabled={!hasStats || !canReset || resetStatsMutation.isPending}
                    >
                        <Trash2 data-icon="inline-start"/>
                        <span className="max-sm:hidden">Reset</span>
                    </Button>
                </div>
                <div className="mt-7">
                    <CompactStatsGrid
                        columns={3}
                        items={[
                            {
                                label: "Runs",
                                note: "completed runs",
                                icon: <Layers3 className="size-4"/>,
                                value: formatNumber(stats.runsPlayed),
                            },
                            {
                                label: "Best score",
                                note: `of ${WCF_MAX_ROUNDS} rounds`,
                                icon: <Trophy className="size-4"/>,
                                value: formatNumber(stats.bestScore),
                            },
                            {
                                label: "Average",
                                note: "rounds per run",
                                icon: <Gauge className="size-4"/>,
                                value: formatNumber(stats.averageScore, { fractionDigits: 1, locale: "en" }),
                            },
                            {
                                label: "Answers",
                                note: "all-time choices",
                                icon: <Check className="size-4"/>,
                                value: formatNumber(stats.totalAnswers),
                            },
                            {
                                label: "Accuracy",
                                note: "correct answers",
                                icon: <Target className="size-4"/>,
                                value: formatPercent(stats.accuracy, { fractionDigits: 0 }),
                            },
                            {
                                label: "Best tier",
                                note: "highest reached",
                                icon: <ChevronRight className="size-4"/>,
                                value: stats.highestTier,
                            },
                        ]}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-7 border-t px-6 py-8 max-sm:px-0">
                <div>
                    <div className="flex items-end justify-between gap-3 text-xs text-muted-foreground">
                        <h3 className="font-semibold uppercase tracking-[0.18em]">
                            Personal best
                        </h3>
                        <span className="font-mono tabular-nums">
                            {stats.bestScore} / {WCF_MAX_ROUNDS}
                        </span>
                    </div>
                    <Progress
                        className="mt-3"
                        value={(stats.bestScore / WCF_MAX_ROUNDS) * 100}
                        aria-label={`${stats.bestScore} of ${WCF_MAX_ROUNDS} rounds`}
                    />
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {stats.bestScore === WCF_MAX_ROUNDS
                            ? "Perfect run completed."
                            : `${WCF_MAX_ROUNDS - stats.bestScore} rounds from a perfect run.`
                        }
                    </p>
                </div>
                <div>
                    <div className="flex items-end justify-between gap-3 text-xs text-muted-foreground">
                        <h3 className="font-semibold uppercase tracking-[0.18em]">
                            Answer accuracy
                        </h3>
                        <span className="font-mono tabular-nums">
                            {formatPercent(stats.accuracy, { fractionDigits: 0 })}
                        </span>
                    </div>
                    <Progress
                        className="mt-3"
                        value={stats.accuracy}
                        aria-label={`${stats.accuracy.toFixed(0)} percent answer accuracy`}
                    />
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Based on {formatNumber(stats.totalAnswers)} answered matchups.
                    </p>
                </div>
            </div>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset statistics?</DialogTitle>
                        <DialogDescription>
                            This permanently deletes all your 'Which Came First' runs and answers.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" disabled={resetStatsMutation.isPending} onClick={() => setResetDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={resetStats} disabled={resetStatsMutation.isPending}>
                            <Trash2 data-icon="inline-start"/>
                            Reset statistics
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
