import {useFormContext} from "react-hook-form";
import type {MediaType} from "@/lib/utils/enums";
import {Input} from "@/lib/client/components/ui/input";
import {MIN_ACTIVITY_DATE} from "@/lib/utils/constants";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import type {MonthlyActivityFieldsInput} from "@/lib/schemas";
import {getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";


type MonthlyActivityFormFieldsProps = {
    mediaType: MediaType;
    showHidden?: boolean;
    movingBetweenMonths?: boolean;
};


export function MonthlyActivityFormFields({ mediaType, showHidden = false, movingBetweenMonths = false }: MonthlyActivityFormFieldsProps) {
    const currentDate = useCurrentDate();
    const { progress } = getMediaDefinition(mediaType)
    const form = useFormContext<MonthlyActivityFieldsInput>();

    return (
        <div className="space-y-6 w-full">
            <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
                <FormField
                    name="progressGained"
                    control={form.control}
                    render={({ field }) =>
                        <FormItem>
                            <FormLabel>
                                {progress.unit.long}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    min={0}
                                    type="number"
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    value={field.value ?? 0}
                                    step={progress.inputStep}
                                    onChange={(ev) => field.onChange(ev.target.valueAsNumber)}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    }
                />
                <FormField
                    name="redoGained"
                    control={form.control}
                    render={({ field }) =>
                        <FormItem>
                            <FormLabel>Re-Experiences Gained</FormLabel>
                            <FormControl>
                                <Input
                                    min={0}
                                    step={1}
                                    type="number"
                                    ref={field.ref}
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    value={field.value ?? 0}
                                    onChange={(ev) => field.onChange(ev.target.valueAsNumber)}
                                />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    }
                />
            </div>
            <FormField
                name="lastActivityAt"
                control={form.control}
                render={({ field }) =>
                    <FormItem>
                        <FormLabel>Activity Date</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                type="date"
                                max={currentDate}
                                min={MIN_ACTIVITY_DATE}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        {movingBetweenMonths &&
                            <FormDescription className="text-xs">
                                Changing the month moves this summary and merges it with an existing one.
                            </FormDescription>
                        }
                        <FormMessage/>
                    </FormItem>
                }
            />
            <FormField
                name="hadCompletion"
                control={form.control}
                render={({ field }) =>
                    <FormItem className="flex items-center gap-2">
                        <FormControl>
                            <Checkbox
                                checked={field.value ?? false}
                                onCheckedChange={(value) => field.onChange(!!value)}
                            />
                        </FormControl>
                        <FormLabel className="font-normal">
                            Completed This Month
                        </FormLabel>
                        <FormMessage/>
                    </FormItem>
                }
            />

            {showHidden &&
                <FormField
                    name="hidden"
                    control={form.control}
                    render={({ field }) =>
                        <FormItem className="flex flex-row items-start gap-2 space-y-0 rounded-md border border-border p-3">
                            <FormControl>
                                <Checkbox
                                    checked={field.value ?? false}
                                    onCheckedChange={(value) => field.onChange(!!value)}
                                />
                            </FormControl>
                            <div className="space-y-1">
                                <FormLabel className="font-medium">Hidden</FormLabel>
                                <FormDescription className="text-xs">
                                    Keep this summary editable, but hide it from monthly activity and yearly recap.
                                </FormDescription>
                                <FormMessage/>
                            </div>
                        </FormItem>
                    }
                />
            }
        </div>
    );
}
