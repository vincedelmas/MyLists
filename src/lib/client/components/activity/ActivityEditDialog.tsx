import {useForm} from "react-hook-form";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {Input} from "@/lib/client/components/ui/input";
import {Label} from "@/lib/client/components/ui/label";
import {Button} from "@/lib/client/components/ui/button";
import {ActivityEditor} from "@/lib/types/activity.types";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {useDeleteActivityMutation, useUpdateActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {getActivityInputStep, getActivityUnitLabel, toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/activity-utils";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {displayContainerError} from "@/lib/utils/error-display";


type FormValues = {
    isRedo: boolean,
    hidden: boolean,
    lastUpdate: string,
    isCompleted: boolean,
    specificGained: number,
}


interface ActivityEditDialogProps {
    open: boolean;
    activity: ActivityEditor;
    onOpenChange: (open: boolean) => void;
}


export const ActivityEditDialog = ({ open, activity, onOpenChange }: ActivityEditDialogProps) => {
    const updateMutation = useUpdateActivityMutation({ noGlobalErrorToast: true });
    const deleteMutation = useDeleteActivityMutation({ noGlobalErrorToast: true });
    const form = useForm<FormValues>({
        values: {
            isRedo: activity.isRedo ?? false,
            hidden: activity.hidden ?? false,
            isCompleted: activity.isCompleted ?? false,
            lastUpdate: toDateInputValue(activity.lastUpdate),
            specificGained: toActivityDisplayValue(activity.mediaType, activity.specificGained ?? 0),
        }
    });

    const handleOnSave = (data: FormValues) => {
        if (!data) return;

        updateMutation.mutate({
            data: {
                activityId: activity.id,
                payload: {
                    isRedo: data.isRedo,
                    hidden: data.hidden,
                    isCompleted: data.isCompleted,
                    lastUpdate: data.lastUpdate ? `${data.lastUpdate}T12:00:00.000Z` : undefined,
                    specificGained: toActivityStoredValue(activity.mediaType, data.specificGained),
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

                <form onSubmit={form.handleSubmit(handleOnSave)} className="space-y-5 mt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="specificGained">
                            {getActivityUnitLabel(activity.mediaType, "long") ?? "Units gained"}
                        </Label>
                        <Input
                            type="number"
                            step={getActivityInputStep(activity.mediaType)}
                            {...form.register("specificGained", { required: true, min: 0 })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lastUpdate">Progress date</Label>
                        <Input
                            type="date"
                            {...form.register("lastUpdate")}
                            max={toDateInputValue(new Date())}
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm" htmlFor="checkbox-1">
                            <Checkbox
                                id="checkbox-1"
                                checked={!form.watch().isCompleted && !form.watch().isRedo}
                                onCheckedChange={() => {
                                    form.setValue("isRedo", false);
                                    form.setValue("isCompleted", false);
                                }}
                            />
                            Progress
                        </label>
                        <label className="flex items-center gap-2 text-sm" htmlFor="checkbox-2">
                            <Checkbox
                                id="checkbox-2"
                                checked={form.watch().isCompleted}
                                onCheckedChange={(val) => {
                                    form.setValue("isCompleted", !!val);
                                    if (val) form.setValue("isRedo", false);
                                }}
                            />
                            Completed
                        </label>
                        <label className="flex items-center gap-2 text-sm" htmlFor="checkbox-3">
                            <Checkbox
                                id="checkbox-3"
                                checked={form.watch().isRedo}
                                onCheckedChange={(val) => {
                                    form.setValue("isRedo", !!val);
                                    if (val) form.setValue("isCompleted", false);
                                }}
                            />
                            Re-experience
                        </label>
                    </div>

                    <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm" htmlFor="checkbox-4">
                        <Checkbox
                            id="checkbox-4"
                            checked={form.watch().hidden}
                            onCheckedChange={(val) => form.setValue("hidden", !!val)}
                        />
                        <span className="space-y-1">
                            <span className="block font-medium">
                                Hidden
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                Keep this activity editable, but hide it from monthly activity and yearly recap.
                            </span>
                        </span>
                    </label>

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
