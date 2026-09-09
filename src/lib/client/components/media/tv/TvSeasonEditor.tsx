import {useId} from "react";
import {Minus, Plus} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {REDO_MAX} from "@/lib/utils/constants";
import {Button} from "@/lib/client/components/ui/button";
import {TvMediaType, UpdateType} from "@/lib/utils/enums";
import {Spinner} from "@/lib/client/components/ui/spinner";
import {formatNumber} from "@/lib/utils/formatting/number";
import {getTvSeasonTotals} from "@/lib/utils/media/tv-seasons";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {RatingSelect} from "@/lib/client/components/media/base/RatingSelect";
import {tvSeasonsOptions} from "@/lib/client/react-query/query-options/tv-seasons.options";
import {useUpdateUserMediaMutation} from "@/lib/client/react-query/query-mutations/user-media.mutations";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface TvSeasonEditorProps {
    open: boolean;
    userId: number;
    mediaId: number;
    mediaType: TvMediaType;
    mode: "rating" | "redo";
    onOpenChange: (open: boolean) => void;
    mutation: ReturnType<typeof useUpdateUserMediaMutation>;
}


export const TvSeasonEditor = ({ open, onOpenChange, mode, mediaType, mediaId, userId, mutation }: TvSeasonEditorProps) => {
    const fieldId = useId();
    const query = useQuery({ ...tvSeasonsOptions(mediaType, mediaId, userId), enabled: open });

    const seasons = query.data ?? [];
    const pending = mutation.isPending || query.isFetching || query.isError;

    const active = seasons.filter(s => s.episodes !== null);
    const { rating: average } = getTvSeasonTotals(seasons);

    const ratedCount = active.filter(season => season.rating !== null).length;

    const changeRating = (season: number, rating: number | null) => {
        mutation.mutate({
            payload: {
                type: UpdateType.RATING,
                seasonRating: { season, rating },
            }
        });
    };

    const changeRedos = (seasonRedos: { season: number; redo: number }[]) => {
        mutation.mutate({
            payload: {
                seasonRedos,
                type: UpdateType.REDO,
            }
        });
    };

    const changeAll = (amount: number) => {
        return changeRedos(active.map(s => ({
            season: s.season,
            redo: Math.min(REDO_MAX, Math.max(0, s.redo + amount)),
        })));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-100 max-sm:w-full">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "rating"
                            ? "Season ratings"
                            : "Re-watched seasons"
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "rating"
                            ? "Your overall rating is the average of rated current seasons."
                            : "Manage how many times you have re-watched each season."
                        } Changes save automatically.
                    </DialogDescription>
                </DialogHeader>

                {query.isPending &&
                    <Spinner className="mx-auto size-6"/>
                }

                {query.isError &&
                    <FieldError>
                        Could not load seasons.
                        <Button variant="ghost" onClick={() => query.refetch()}>
                            Retry
                        </Button>
                    </FieldError>
                }

                {mode === "rating" && query.data &&
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-sm font-medium">
                                Your Average
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {ratedCount} of {active.length} current seasons rated
                            </p>
                        </div>
                        <output className="text-xl font-semibold tabular-nums pr-2">
                            {`${formatNumber(average, { locale: "en", fractionDigits: 1 })} / 10`}
                        </output>
                    </div>
                }

                {mode === "redo" && active.length > 0 &&
                    <div className="flex items-center justify-between pr-1">
                        <span>All Current Seasons</span>
                        <ButtonGroup aria-label="Adjust all season rewatches">
                            <Button
                                size="icon"
                                variant="outline"
                                aria-label="Decrease all season rewatches"
                                onClick={() => changeAll(-1)}
                                disabled={pending || active.every(s => s.redo === 0)}
                            >
                                <Minus/>
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => changeAll(1)}
                                aria-label="Increase all season rewatches"
                                disabled={pending || active.every(s => s.redo === REDO_MAX)}
                            >
                                <Plus/>
                            </Button>
                        </ButtonGroup>
                    </div>
                }

                <FieldGroup className="max-h-80 gap-3 overflow-y-auto scrollbar-thin pr-1">
                    {seasons.map(s =>
                        <Field key={s.season} orientation="horizontal" className="justify-between" data-disabled={pending}>
                            <FieldContent>
                                <FieldLabel htmlFor={mode === "rating" ? `${fieldId}-${s.season}` : undefined}>
                                    Season {s.season}
                                </FieldLabel>
                                <FieldDescription>
                                    {s.episodes === null
                                        ? "Unavailable · excluded from totals"
                                        : `${s.episodes} episodes`
                                    }
                                </FieldDescription>
                            </FieldContent>

                            {s.episodes === null ?
                                <Button
                                    size="sm"
                                    variant="outline"
                                    id={`${fieldId}-${s.season}`}
                                    disabled={pending || (mode === "rating" ? s.rating === null : s.redo === 0)}
                                    onClick={() => mode === "rating"
                                        ? changeRating(s.season, null)
                                        : changeRedos([{ season: s.season, redo: 0 }])
                                    }
                                >
                                    Clear{" "}
                                    {mode === "rating" ? s.rating ?? "rating" : `${s.redo}x`}
                                </Button>
                                :
                                mode === "rating" ?
                                    <RatingSelect
                                        rating={s.rating}
                                        disabled={pending}
                                        className="rounded-r-md!"
                                        id={`${fieldId}-${s.season}`}
                                        onChange={rating => changeRating(s.season, rating)}
                                    />
                                    :
                                    <div className="flex items-center gap-3">
                                        <span className="tabular-nums">
                                            {s.redo}x
                                        </span>
                                        <ButtonGroup aria-label={`Season ${s.season} rewatches`}>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                disabled={pending || s.redo === 0}
                                                onClick={() => changeRedos([{ season: s.season, redo: s.redo - 1 }])}
                                            >
                                                <Minus/>
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                disabled={pending || s.redo === REDO_MAX}
                                                onClick={() => changeRedos([{ season: s.season, redo: s.redo + 1 }])}
                                            >
                                                <Plus/>
                                            </Button>
                                        </ButtonGroup>
                                    </div>
                            }
                        </Field>
                    )}
                </FieldGroup>

                <DialogFooter>
                    {mutation.isPending &&
                        <Spinner
                            aria-label="Saving season changes"
                        />
                    }
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
