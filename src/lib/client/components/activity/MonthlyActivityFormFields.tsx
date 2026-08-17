import {useId} from "react";
import type {MediaType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {Controller, useFormContext} from "react-hook-form";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import type {MonthlyActivityFieldsInput} from "@/lib/schemas";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel} from "@/lib/client/components/ui/field";


type MonthlyActivityFormFieldsProps = {
    mediaType: MediaType;
    showHidden?: boolean;
    restrictToYear?: number;
    movingBetweenMonths?: boolean;
};


export function MonthlyActivityFormFields({ mediaType, restrictToYear, showHidden = false, movingBetweenMonths = false }: MonthlyActivityFormFieldsProps) {
    const fieldId = useId();
    const currentDate = useCurrentDate();
    const { progress } = getMediaDefinition(mediaType)

    const form = useFormContext<MonthlyActivityFieldsInput>();
    const today = currentDate ?? toDateInputValue(new Date());

    const currentYear = Number(today.slice(0, 4));
    const minimumDate = restrictToYear ? `${restrictToYear}-01-01` : MIN_ACTIVITY_DATE;
    const maximumDate = restrictToYear && restrictToYear < currentYear ? `${restrictToYear}-12-31` : today;

    return (
        <FieldGroup className="gap-6">
            <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
                <Controller
                    name="progressGained"
                    control={form.control}
                    render={({ field, fieldState }) =>
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={`${fieldId}-progress-gained`}>
                                {progress.unit.long}
                            </FieldLabel>
                            <Input
                                min={0}
                                type="number"
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                value={field.value ?? 0}
                                step={progress.inputStep}
                                id={`${fieldId}-progress-gained`}
                                aria-invalid={fieldState.invalid}
                                onChange={(ev) => field.onChange(ev.target.valueAsNumber)}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    }
                />
                <Controller
                    name="redoGained"
                    control={form.control}
                    render={({ field, fieldState }) =>
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={`${fieldId}-redo-gained`}>Re-Experiences Gained</FieldLabel>
                            <Input
                                id={`${fieldId}-redo-gained`}
                                min={0}
                                step={1}
                                type="number"
                                ref={field.ref}
                                name={field.name}
                                onBlur={field.onBlur}
                                value={field.value ?? 0}
                                aria-invalid={fieldState.invalid}
                                onChange={(ev) => field.onChange(ev.target.valueAsNumber)}
                            />
                            <FieldError errors={[fieldState.error]}/>
                        </Field>
                    }
                />
            </div>
            <Controller
                name="lastActivityAt"
                control={form.control}
                render={({ field, fieldState }) =>
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`${fieldId}-last-activity-at`}>Activity Date</FieldLabel>
                        <Input
                            {...field}
                            type="date"
                            max={maximumDate}
                            min={minimumDate}
                            value={field.value ?? ""}
                            aria-invalid={fieldState.invalid}
                            id={`${fieldId}-last-activity-at`}
                        />
                        {movingBetweenMonths &&
                            <FieldDescription className="text-xs">
                                Changing the month moves this summary and merges it with an existing one.
                            </FieldDescription>
                        }
                        <FieldError errors={[fieldState.error]}/>
                    </Field>
                }
            />
            <Controller
                name="hadCompletion"
                control={form.control}
                render={({ field, fieldState }) =>
                    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                        <Checkbox
                            checked={field.value ?? false}
                            id={`${fieldId}-had-completion`}
                            aria-invalid={fieldState.invalid}
                            onCheckedChange={(value) => field.onChange(value)}
                        />
                        <FieldContent>
                            <FieldLabel htmlFor={`${fieldId}-had-completion`} className="font-normal">
                                Completed This Month
                            </FieldLabel>
                            <FieldError errors={[fieldState.error]}/>
                        </FieldContent>
                    </Field>
                }
            />

            {showHidden &&
                <Controller
                    name="hidden"
                    control={form.control}
                    render={({ field, fieldState }) =>
                        <Field orientation="horizontal" className="rounded-md border border-border p-3" data-invalid={fieldState.invalid}>
                            <Checkbox
                                id={`${fieldId}-hidden`}
                                checked={field.value ?? false}
                                aria-invalid={fieldState.invalid}
                                onCheckedChange={(value) => field.onChange(value)}
                            />
                            <FieldContent>
                                <FieldLabel htmlFor={`${fieldId}-hidden`} className="font-medium">Hidden</FieldLabel>
                                <FieldDescription className="text-xs">
                                    Keep this summary editable, but hide it from monthly activity and yearly recap.
                                </FieldDescription>
                                <FieldError errors={[fieldState.error]}/>
                            </FieldContent>
                        </Field>
                    }
                />
            }
        </FieldGroup>
    );
}
