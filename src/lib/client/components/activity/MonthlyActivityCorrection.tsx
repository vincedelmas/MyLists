import {useId, useState} from "react";
import type {MediaType} from "@/lib/utils/enums";
import {Badge} from "@/lib/client/components/ui/badge";
import {formatMonthYear} from "@/lib/utils/formatting/date";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {requestConfirm} from "@/lib/client/hooks/use-confirm";
import {Alert, AlertDescription} from "@/lib/client/components/ui/alert";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {allocateActivityCorrection, toActivityDisplayValue} from "@/lib/utils/media/activity";
import type {ActivityCorrectionChoice, ActivityCorrectionPreview} from "@/lib/types/activity.types";
import {Field, FieldContent, FieldDescription, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


interface ActivityCorrectionFieldsProps {
    mediaType: MediaType;
    preview: ActivityCorrectionPreview;
    onChange: (choice: ActivityCorrectionChoice) => void;
}


function ActivityCorrectionFields({ mediaType, preview, onChange }: ActivityCorrectionFieldsProps) {
    const fieldId = useId();
    const { progress } = getMediaDefinition(mediaType);
    const [choice, setChoice] = useState<ActivityCorrectionChoice>({ version: preview.version });

    const allocation = allocateActivityCorrection(preview, choice.startMonth);
    const items = preview.months.map(month => ({
        value: month.monthBucket,
        label: formatMonthYear(month.monthBucket, { month: "long" }),
    }));

    return (
        <FieldGroup className="max-h-[55vh] gap-4 overflow-y-auto">
            <Field orientation="horizontal">
                <Checkbox
                    id={`${fieldId}-keep-history`}
                    checked={choice.keepHistory ?? false}
                    onCheckedChange={keepHistory => {
                        const next = { ...choice, keepHistory };
                        setChoice(next);
                        onChange(next);
                    }}
                />
                <FieldContent>
                    <FieldLabel htmlFor={`${fieldId}-keep-history`}>
                        Keep activity unchanged
                    </FieldLabel>
                    <FieldDescription>
                        Use this if you are restarting, or have already corrected your activity manually.
                    </FieldDescription>
                </FieldContent>
            </Field>

            {!choice.keepHistory && <>
                {items.length > 1 &&
                    <Field>
                        <FieldLabel htmlFor={`${fieldId}-month`}>
                            Correct activity starting in
                        </FieldLabel>
                        <Select
                            items={items}
                            value={choice.startMonth ?? items[0].value}
                            onValueChange={startMonth => {
                                if (!startMonth) return;
                                const next = { ...choice, startMonth };
                                setChoice(next);
                                onChange(next);
                            }}
                        >
                            <SelectTrigger id={`${fieldId}-month`} className="w-full">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {items.map(item =>
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>)}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FieldDescription>
                            Subtract from this month first, then earlier months if needed.
                        </FieldDescription>
                    </Field>
                }

                <div className="flex flex-col gap-3 text-sm" aria-live="polite" aria-label="Proposed activity changes">
                    {allocation.changes.map(change =>
                        <div key={change.id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                    {formatMonthYear(change.monthBucket, { month: "long" })}
                                </span>
                                {change.hidden &&
                                    <Badge variant="secondary">Hidden</Badge>
                                }
                            </div>
                            {change.progressRemoved > 0 &&
                                <p className="text-muted-foreground">
                                    {toActivityDisplayValue(mediaType, change.progressGained)} → {toActivityDisplayValue(mediaType, change.progressGained - change.progressRemoved)} {progress.unit.short}
                                </p>
                            }
                            {change.redoRemoved > 0 &&
                                <p className="text-muted-foreground">
                                    {change.redoGained} → {change.redoGained - change.redoRemoved} re-experiences
                                </p>
                            }
                        </div>
                    )}
                </div>

                {(allocation.unrecordedProgress > 0 || allocation.unrecordedRedo > 0) &&
                    <Alert>
                        <AlertDescription>
                            {allocation.unrecordedProgress > 0 &&
                                <p>
                                    {toActivityDisplayValue(mediaType, allocation.unrecordedProgress)} {progress.unit.short} have no matching recorded activity.
                                </p>
                            }

                            {allocation.unrecordedRedo > 0 &&
                                <p>
                                    {allocation.unrecordedRedo} re-experiences have no matching recorded activity.
                                </p>
                            }

                            <p>Your progress will still be updated. Activity totals will stay at or above zero.</p>
                        </AlertDescription>
                    </Alert>
                }
            </>}
        </FieldGroup>
    );
}


export const requestActivityCorrection = async (mediaType: MediaType, preview: ActivityCorrectionPreview) => {
    let choice: ActivityCorrectionChoice = { version: preview.version };

    const confirmed = await requestConfirm({
        title: "Correct monthly activity",
        description: "This decrease affects earlier activity or exceeds the progress recorded this month. Review how it should change your history.",
        confirmLabel: "Save correction",
        content: <ActivityCorrectionFields key={crypto.randomUUID()} mediaType={mediaType} preview={preview} onChange={value => { choice = value; }}/>,
    });

    return confirmed ? choice : null;
};
