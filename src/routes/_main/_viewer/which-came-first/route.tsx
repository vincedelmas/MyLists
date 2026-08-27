import {useEffect, useState} from "react";
import {cn} from "@/lib/utils/classnames";
import {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {PageTitle} from "@/lib/client/components/general/PageTitle";
import {useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {WCF_MAX_ROUNDS, WCF_MEDIA_TYPES} from "@/lib/schemas/wcf.schema";
import {SimpleStatCard} from "@/lib/client/components/user-profile/SimpleStatCard";
import {MediaTypeIcon} from "@/lib/client/components/media/base/MediaTypeIndicator";
import {dateFromUTCInput, extractDate, formatDate} from "@/lib/utils/date-formatting";
import {whichCameFirstOptions} from "@/lib/client/react-query/query-options/wcf.options";
import {Card, CardContent, CardHeader, CardTitle} from "@/lib/client/components/ui/card";
import {MediaCardRightCorner, MediaCardTitle} from "@/lib/client/components/media/base/MediaCard";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {ArrowRight, CalendarClock, Check, ChevronRight, Gauge, House, Layers3, RotateCcw, Target, Trash2, Trophy, X} from "lucide-react";
import {useAbandonWCFRunMutation, useAnswerWCFRoundMutation, useResetWCFStatsMutation, useStartWCFRunMutation} from "@/lib/client/react-query/query-mutations/wcf.mutations";


export const Route = createFileRoute("/_main/_viewer/which-came-first")({
    context: () => ({ whichCameFirstQueryOptions: whichCameFirstOptions }),
    loader: ({ context }) => context.queryClient.ensureQueryData(context.whichCameFirstQueryOptions),
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
    const { activeRun, stats } = useSuspenseQuery(whichCameFirstQueryOptions).data;
    const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<MediaType[]>(activeRun?.selectedMediaTypes ?? [...WCF_MEDIA_TYPES]);

    const toggleMediaType = (mediaType: MediaType) => {
        setSelectedTypes((current) => current.includes(mediaType)
            ? current.filter((type) => type !== mediaType)
            : [...current, mediaType]);
    };

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
        <PageTitle title="Which Came First?" subtitle="Choose the media that was released first. One mistake ends the run.">
            <div className="mx-auto max-w-5xl space-y-6">
                <Stats
                    stats={stats}
                    canReset={!activeRun && !answerResult}
                />
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
                            onToggle={toggleMediaType}
                            selectedTypes={selectedTypes}
                            isPending={startMutation.isPending}
                        />
                }
            </div>
        </PageTitle>
    );
}


interface GameSetupProps {
    isPending: boolean;
    onStart: () => void;
    selectedTypes: MediaType[];
    onToggle: (type: MediaType) => void;
}


function GameSetup({ selectedTypes, onToggle, isPending, onStart }: GameSetupProps) {
    const clearOrSelectAll = () => {
        if (selectedTypes.length === WCF_MEDIA_TYPES.length) {
            selectedTypes.forEach(onToggle);
        }
        else {
            WCF_MEDIA_TYPES.filter((type) => !selectedTypes.includes(type)).forEach(onToggle);
        }
    };

    return (
        <Card className="relative mx-auto max-w-4xl overflow-hidden p-0 shadow-lg shadow-black/5 ring-border/80">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"/>
            <div className="grid md:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="relative p-6 sm:p-8">
                    <CardHeader className="mb-6 gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                            <CalendarClock className="size-5"/>
                        </div>
                        <div>
                            <CardTitle className="text-2xl">
                                Choose Your Media Pool
                            </CardTitle>
                            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                Pick the media you know best. Every round mixes two titles from your chosen pool.
                            </p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-2 max-lg:grid-cols-3 max-sm:grid-cols-2">
                            {WCF_MEDIA_TYPES.map((mediaType) => {
                                const selected = selectedTypes.includes(mediaType);

                                return (
                                    <label
                                        key={mediaType}
                                        htmlFor={`which-came-first-${mediaType}`}
                                        className={cn("group relative flex min-h-20 cursor-pointer flex-col justify-between " +
                                            "overflow-hidden rounded-lg border p-3.5",
                                            "transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/60",
                                            selected ? "border-brand/60 bg-brand/8 shadow-sm ring-1 ring-brand/15"
                                                : "border-border/80 bg-background/40",
                                        )}
                                    >
                                        <Checkbox
                                            checked={selected}
                                            id={`which-came-first-${mediaType}`}
                                            className="absolute right-3.5 top-3.5"
                                            onCheckedChange={() => onToggle(mediaType)}
                                        />
                                        <MainThemeIcon
                                            size={22}
                                            type={mediaType}
                                            className="transition-transform group-hover:scale-110"
                                        />
                                        <span className="block text-sm font-semibold capitalize">
                                            {mediaType}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={clearOrSelectAll}
                            className="mt-5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors
                            hover:text-foreground hover:underline"
                        >
                            {selectedTypes.length === WCF_MEDIA_TYPES.length ? "Clear selection" : "Select all"}
                        </button>
                    </CardContent>
                </div>
                <aside className="relative flex flex-col justify-between border-l bg-muted/35 p-6 max-md:border-l-0 max-md:border-t sm:p-8">
                    <div>
                        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Your game
                        </span>
                        <div className="mt-5 flex items-end gap-2">
                            <strong className="text-5xl font-bold leading-none tabular-nums text-foreground">
                                {selectedTypes.length}
                            </strong>
                            <span className="pb-1 text-sm text-muted-foreground">
                                {selectedTypes.length === 1 ? "category" : "categories"}
                            </span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-1.5">
                            {selectedTypes.length > 0 ? selectedTypes.map((mediaType) =>
                                    <Badge key={mediaType} variant="overlay" className="capitalize">
                                        <MainThemeIcon type={mediaType}/>
                                        {mediaType}
                                    </Badge>
                                ) :
                                <span className="text-sm text-muted-foreground">
                                    Choose at least one to play.
                                </span>
                            }
                        </div>
                    </div>
                    <Button
                        size="lg"
                        onClick={onStart}
                        disabled={selectedTypes.length === 0 || isPending}
                        className="mt-5 w-full shadow-md shadow-primary/15"
                    >
                        Start the run
                        <ArrowRight/>
                    </Button>
                </aside>
            </div>
        </Card>
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
        <div className="space-y-6">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-xl border bg-card px-3 py-2.5 shadow-sm sm:px-4">
                <div className="flex items-center gap-3 sm:gap-5">
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-brand/12 text-brand">
                            <Trophy className="size-4"/>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Score
                            </p>
                            <p className="text-lg font-bold leading-none tabular-nums">
                                {displayedScore}
                            </p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-border"/>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Round
                        </p>
                        <p className="text-lg font-bold leading-none tabular-nums">
                            {run.round.number} / {WCF_MAX_ROUNDS}
                        </p>
                    </div>
                    <Badge variant="outline">
                        <Gauge/> {run.round.difficulty} apart
                    </Badge>
                </div>
                {!result &&
                    <Button variant="destructiveGhost" onClick={onAbandon}>
                        <X/>
                        <span className="max-sm:hidden">End run</span>
                    </Button>
                }
            </div>
            <div className="relative mx-auto grid max-w-xl grid-cols-2 gap-4 sm:gap-7">
                <MediaCard
                    side="left"
                    result={result}
                    onSelect={onAnswer}
                    card={run.round.left}
                    disabled={isPending || !!result}
                />
                <div className="absolute left-1/2 top-1/2 z-20 flex size-14 -translate-x-1/2 -translate-y-1/2
                    items-center justify-center rounded-full border-4 border-background bg-primary text-lg font-black
                    tracking-wider text-primary-foreground shadow-xl max-sm:size-10"
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
            <div className="min-h-12 text-center" aria-live="polite">
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
        </div>
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
        <Card className={cn("relative mx-auto max-w-4xl animate-in overflow-hidden p-0 shadow-xl shadow-black/5",
            "fade-in zoom-in-95 duration-300", completedWithoutLoss ? "ring-brand/30" : "ring-destructive/30")}>
            <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b to-transparent",
                completedWithoutLoss ? "from-brand/8" : "from-destructive/8")}/>
            <CardContent className="relative space-y-7 px-6 py-9 text-center sm:px-10">
                <div className={cn("mx-auto flex size-16 items-center justify-center rounded-2xl border shadow-sm",
                    completedWithoutLoss
                        ? "border-brand/20 bg-brand/10 text-brand"
                        : "border-destructive/20 bg-destructive/10 text-destructive")}>
                    {completedWithoutLoss ? <Trophy className="size-10"/> : <X className="size-10"/>}
                </div>
                <div className="space-y-2">
                    <span className={cn("text-sm font-semibold uppercase tracking-[0.2em]",
                        completedWithoutLoss ? "text-brand" : "text-destructive")}>
                        {result.won ? "Run won" : result.poolExhausted ? "Pool exhausted" : "Run complete"}
                    </span>
                    <h2 className="text-4xl font-bold tracking-tight">
                        {result.won ? "You cleared all 30 rounds"
                            : result.poolExhausted ? `You cleared ${result.score} rounds`
                                : `You scored: ${result.score}`}
                    </h2>
                    <p className="mx-auto max-w-lg text-muted-foreground">
                        {verdict}
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-2 max-md:grid-cols-2">
                    <SimpleStatCard
                        title="Correct"
                        value={result.score}
                        className="bg-background/60 shadow-none"
                    />
                    <SimpleStatCard
                        title="Rounds"
                        className="bg-background/60 shadow-none"
                        value={`${roundsAnswered} / ${WCF_MAX_ROUNDS}`}
                    />
                    <SimpleStatCard title="Difficulty" className="bg-background/60 shadow-none">
                        <span className="text-xl font-bold text-foreground">
                            {run.round.difficulty}
                        </span>
                    </SimpleStatCard>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Your Media pool
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {run.selectedMediaTypes.map((mediaType) =>
                            <Badge key={mediaType} variant="outline" className="capitalize">
                                <MainThemeIcon type={mediaType}/>
                                {mediaType}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex justify-center items-center gap-3 pt-1 max-sm:flex-col">
                    <Button variant="outline" disabled={isStarting} onClick={onMainMenu}>
                        <House/>
                        Main menu
                    </Button>
                    <Button disabled={isStarting} onClick={onPlayAgain}>
                        <RotateCcw/>
                        Play again
                    </Button>
                </div>
            </CardContent>
        </Card>
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
                "@container/media-card group relative aspect-2/3 overflow-hidden rounded-lg border-2 bg-card text-left text-white",
                "transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl disabled:pointer-events-none",
                state === "correct" && "scale-[1.01] border-success shadow-lg shadow-success/30",
                state === "incorrect" && "animate-wcf-shake border-destructive shadow-lg shadow-destructive/30",
                !!result && state === "neutral" && "opacity-55 grayscale-35",
                !result && "border-border/80 shadow-md shadow-black/10 hover:border-brand/70",
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
        <section className="rounded-xl border border-border/70 bg-card/50 px-3 py-3 sm:px-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Target className="size-4 text-brand"/>
                    <h3 className="text-sm font-semibold">
                        Your statistics
                    </h3>
                </div>
                <Button
                    variant="destructiveGhost"
                    onClick={() => setResetDialogOpen(true)}
                    disabled={!hasStats || !canReset || resetStatsMutation.isPending}
                >
                    <Trash2/>
                    <span className="max-sm:hidden">Reset statistics</span>
                </Button>
            </div>
            <div className="grid grid-cols-6 gap-2 max-lg:grid-cols-3 max-sm:grid-cols-2">
                <SimpleStatCard
                    title="Runs"
                    value={stats.runsPlayed}
                    icon={<Layers3 className="size-4 text-muted-foreground"/>}
                    className="border-0 bg-muted/45 px-3 py-3 shadow-none [&_span:last-child]:text-2xl"
                />
                <SimpleStatCard
                    title="Best score"
                    value={stats.bestScore}
                    icon={<Trophy className="size-4 text-brand"/>}
                    className="border-0 bg-muted/45 px-3 py-3 shadow-none [&_span:last-child]:text-2xl"
                />
                <SimpleStatCard
                    title="Average"
                    value={stats.averageScore.toFixed(1)}
                    className="border-0 bg-muted/45 px-3 py-3 shadow-none [&_span:last-child]:text-2xl"
                />
                <SimpleStatCard
                    title="Answers"
                    value={stats.totalAnswers}
                    className="border-0 bg-muted/45 px-3 py-3 shadow-none [&_span:last-child]:text-2xl"
                />
                <SimpleStatCard
                    title="Accuracy"
                    value={`${stats.accuracy.toFixed(0)}%`}
                    className="border-0 bg-muted/45 px-3 py-3 shadow-none [&_span:last-child]:text-2xl"
                />
                <SimpleStatCard
                    title="Best tier"
                    value={stats.highestTier}
                    icon={<ChevronRight className="size-4 text-muted-foreground"/>}
                    className="border-0 bg-muted/45 px-3 py-3 shadow-none [&_span:last-child]:text-2xl"
                />
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
                            Reset statistics
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
