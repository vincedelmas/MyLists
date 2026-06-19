import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {Button} from "@/lib/client/components/ui/button";
import {ActivityEditor} from "@/lib/types/activity.types";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {displayContainerError} from "@/lib/utils/error-display";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {UpdateActivity, UpdateActivityInput, updateActivityPayloadSchema} from "@/lib/schemas";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {useDeleteActivityMutation, useUpdateActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {getActivityInputStep, getActivityUnitLabel, toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/activity-utils";


interface ActivityEditDialogProps {
    open: boolean;
    activity: ActivityEditor;
    onOpenChange: (open: boolean) => void;
}


export const ActivityEditDialog = ({ open, activity, onOpenChange }: ActivityEditDialogProps) => {
    const updateMutation = useUpdateActivityMutation({ noGlobalErrorToast: true });
    const deleteMutation = useDeleteActivityMutation({ noGlobalErrorToast: true });
    const form = useForm<UpdateActivityInput, unknown, UpdateActivity>({
        resolver: zodResolver(updateActivityPayloadSchema),
        values: {
            isRedo: activity.isRedo ?? false,
            hidden: activity.hidden ?? false,
            isCompleted: activity.isCompleted ?? false,
            lastUpdate: toDateInputValue(activity.lastUpdate),
            specificGained: toActivityDisplayValue(activity.mediaType, activity.specificGained ?? 0),
        }
    });

    const isRedo = form.watch("isRedo");
    const isCompleted = form.watch("isCompleted");

    const handleOnSave = (data: UpdateActivity) => {
        if (!data) return;

        updateMutation.mutate({
            data: {
                activityId: activity.id,
                payload: {
                    isRedo: data.isRedo,
                    hidden: data.hidden,
                    isCompleted: data.isCompleted,
                    lastUpdate: data.lastUpdate ? `${data.lastUpdate}T12:00:00.000Z` : undefined,
                    specificGained: data.specificGained === undefined ? undefined : toActivityStoredValue(activity.mediaType, data.specificGained),
                }
            }
        }, {
            onSuccess: () => {
                onOpenChange(false);
            }
        });
    };

    const handleOnDelete = () => {
        if (!window.confirm("Delete this activity event?")) return;

        deleteMutation.mutate({ data: { activityId: activity.id } }, {
            onSuccess: () => {
                onOpenChange(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-100 max-sm:w-full">
                <DialogHeader>
                    <DialogTitle>Edit Activity - {activity.mediaName}</DialogTitle>
                    <DialogDescription>Adjust or remove this monthly activity.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleOnSave)} className="space-y-5 mt-2">
                        <FormField
                            name="specificGained"
                            control={form.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>
                                        {getActivityUnitLabel(activity.mediaType, "long") ?? "Units gained"}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            ref={field.ref}
                                            name={field.name}
                                            value={field.value ?? 0}
                                            onBlur={field.onBlur}
                                            step={getActivityInputStep(activity.mediaType)}
                                            onChange={(ev) => field.onChange(ev.target.valueAsNumber)}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                        <FormField
                            name="lastUpdate"
                            control={form.control}
                            render={({ field }) =>
                                <FormItem>
                                    <FormLabel>Progress date</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="date"
                                            value={field.value ?? ""}
                                            max={toDateInputValue(new Date())}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />

                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    id="activity-progress"
                                    checked={!isCompleted && !isRedo}
                                    onCheckedChange={() => {
                                        form.setValue("isRedo", false, { shouldDirty: true, shouldValidate: true });
                                        form.setValue("isCompleted", false, { shouldDirty: true, shouldValidate: true });
                                    }}
                                />
                                <label htmlFor="activity-progress">Progress</label>
                            </div>
                            <FormField
                                name="isCompleted"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value ?? false}
                                                onCheckedChange={(value) => {
                                                    field.onChange(!!value);
                                                    if (value) {
                                                        form.setValue("isRedo", false, { shouldDirty: true, shouldValidate: true });
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Completed</FormLabel>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                            <FormField
                                name="isRedo"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value ?? false}
                                                onCheckedChange={(value) => {
                                                    field.onChange(!!value);
                                                    if (value) {
                                                        form.setValue("isCompleted", false, { shouldDirty: true, shouldValidate: true });
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Re-experience</FormLabel>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                        </div>

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
                                        <FormLabel className="font-medium">
                                            Hidden
                                        </FormLabel>
                                        <FormDescription className="text-xs">
                                            Keep this activity editable, but hide it from monthly activity and yearly recap.
                                        </FormDescription>
                                        <FormMessage/>
                                    </div>
                                </FormItem>
                            }
                        />
                        {(updateMutation.isError || deleteMutation.isError) &&
                            <InlineErrorContainer>
                                {displayContainerError({ error: updateMutation.error ?? deleteMutation.error })}
                            </InlineErrorContainer>
                        }
                        <DialogFooter className="pt-2 mx-auto gap-3">
                            <Button type="button" variant="destructive" onClick={handleOnDelete} disabled={deleteMutation.isPending}>
                                Delete
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>

                <div className="text-xs text-destructive">
                    <b>Note:</b> These values determine how your time is allocated to your{" "}
                    monthly and yearly recaps. For example, you can log a show you watched years
                    ago without it inflating your current monthly / yearly recap. This does not affect your total lifetime
                    progress, only how it is distributed in your history.
                </div>
            </DialogContent>
        </Dialog>
    );
};
