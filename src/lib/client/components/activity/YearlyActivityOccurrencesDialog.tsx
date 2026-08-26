import {Button} from "@/lib/client/components/ui/button";
import {toActivityDisplayValue} from "@/lib/utils/activity-utils";
import {formatMinutes, formatNumber} from "@/lib/utils/number-formatting";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {ArrowRight, CheckCircle, Clock3, Hourglass, RotateCw} from "lucide-react";
import {MonthlyActivityEditor, MonthlyActivityOccurrence} from "@/lib/types/activity.types";
import {formatDateTime, formatMonthYear, toDateTimeAttribute} from "@/lib/utils/date-formatting";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface YearlyActivityOccurrencesDialogProps {
    open: boolean;
    activity: MonthlyActivityEditor;
    onOpenChange: (open: boolean) => void;
    onSelect: (occurrence: MonthlyActivityOccurrence) => void;
}


export function YearlyActivityOccurrencesDialog({ open, activity, onOpenChange, onSelect }: YearlyActivityOccurrencesDialogProps) {
    const occurrences = activity.occurrences ?? [];
    const progressUnit = getMediaDefinition(activity.mediaType).progress.unit.short;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{activity.mediaName} activity</DialogTitle>
                    <DialogDescription>
                        Activity was recorded in {occurrences.length} months. Select an occurrence to open that month.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {occurrences.map((occurrence) =>
                        <Button
                            type="button"
                            variant="outline"
                            key={occurrence.id}
                            onClick={() => onSelect(occurrence)}
                            className="h-auto w-full justify-between gap-3 p-3 text-left whitespace-normal"
                        >
                            <span className="min-w-0 space-y-1">
                                <span className="block font-medium">
                                    {formatMonthYear(occurrence.monthBucket, { month: "long" })}
                                </span>
                                <time
                                    className="block text-xs font-normal text-muted-foreground"
                                    dateTime={toDateTimeAttribute(occurrence.lastActivityAt)}
                                >
                                    {formatDateTime(occurrence.lastActivityAt)}
                                </time>
                                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
                                    {occurrence.progressGained > 0 &&
                                        <span className="inline-flex items-center gap-1">
                                            <Hourglass className="size-3"/>
                                            {formatNumber(toActivityDisplayValue(activity.mediaType, occurrence.progressGained), { locale: "en" })} {progressUnit}
                                        </span>
                                    }
                                    {occurrence.timeGained > 0 &&
                                        <span className="inline-flex items-center gap-1">
                                            <Clock3 className="size-3"/> {formatMinutes(occurrence.timeGained)}
                                        </span>
                                    }
                                    {occurrence.hadCompletion &&
                                        <span className="inline-flex items-center gap-1">
                                            <CheckCircle className="size-3"/> Completed
                                        </span>
                                    }
                                    {occurrence.redoGained > 0 &&
                                        <span className="inline-flex items-center gap-1">
                                            <RotateCw className="size-3"/> Re-experienced ×{occurrence.redoGained}
                                        </span>
                                    }
                                </span>
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground"/>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
