import {useSelector} from "@tanstack/react-store";
import {updateActivityFormSchema} from "@/lib/schemas";
import {Button} from "@/lib/client/components/ui/button";
import {ActivityEditor} from "@/lib/types/activity.types";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {useAppForm} from "@/lib/client/components/forms/form";
import {displayContainerError} from "@/lib/utils/error-display";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {useDeleteActivityMutation, useUpdateActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {getActivityInputStep, getActivityUnitLabel, toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/activity-utils";


interface ActivityEditDialogProps {
    open: boolean;
    activity: ActivityEditor;
    onOpenChange: (open: boolean) => void;
}


export const ActivityEditDialog = ({ open, activity, onOpenChange }: ActivityEditDialogProps) => {
    const currentDate = useCurrentDate();
    const updateMutation = useUpdateActivityMutation({ noGlobalErrorToast: true });
    const deleteMutation = useDeleteActivityMutation({ noGlobalErrorToast: true });
    const form = useAppForm({
        defaultValues: {
            isRedo: activity.isRedo ?? false,
            hidden: activity.hidden ?? false,
            isCompleted: activity.isCompleted ?? false,
            lastUpdate: toDateInputValue(activity.lastUpdate),
            specificGained: toActivityDisplayValue(activity.mediaType, activity.specificGained ?? 0),
        },
        validators: {
            onSubmit: updateActivityFormSchema,
        },
        onSubmit: async ({ value }) => {
            await updateMutation.mutateAsync({
                data: {
                    activityId: activity.id,
                    payload: {
                        ...value,
                        lastUpdate: `${value.lastUpdate}T12:00:00.000Z`,
                        specificGained: toActivityStoredValue(activity.mediaType, value.specificGained),
                    },
                },
            });
            onOpenChange(false);
        },
    });

    const isRedo = useSelector(form.store, (state) => state.values.isRedo);
    const isCompleted = useSelector(form.store, (state) => state.values.isCompleted);

    const handleOnDelete = async () => {
        if (!window.confirm("Delete this activity event?")) return;

        await deleteMutation.mutateAsync({ data: { activityId: activity.id } });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-100 max-sm:w-full">
                <DialogHeader>
                    <DialogTitle>Edit Activity - {activity.mediaName}</DialogTitle>
                    <DialogDescription>Adjust or remove this monthly activity.</DialogDescription>
                </DialogHeader>

                <form.AppForm>
                    <form.FormRoot className="space-y-5 mt-2">
                        <form.FormFieldset className="space-y-5" disabled={deleteMutation.isPending}>
                            <form.AppField name="specificGained">
                                {(field) =>
                                    <field.NumberField
                                        step={getActivityInputStep(activity.mediaType)}
                                        label={getActivityUnitLabel(activity.mediaType, "long") ?? "Units gained"}
                                    />
                                }
                            </form.AppField>
                            <form.AppField name="lastUpdate">
                                {(field) =>
                                    <field.TextField
                                        type="date"
                                        max={currentDate}
                                        label="Progress date"
                                    />
                                }
                            </form.AppField>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        id="activity-progress"
                                        checked={!isCompleted && !isRedo}
                                        onCheckedChange={() => {
                                            form.setFieldValue("isRedo", false);
                                            form.setFieldValue("isCompleted", false);
                                        }}
                                    />
                                    <label htmlFor="activity-progress">Progress</label>
                                </div>
                                <form.AppField name="isCompleted">
                                    {(field) =>
                                        <field.CheckboxField
                                            label="Completed"
                                            labelClassName="font-normal"
                                            onCheckedChange={(checked) => {
                                                if (checked) form.setFieldValue("isRedo", false);
                                            }}
                                        />
                                    }
                                </form.AppField>
                                <form.AppField name="isRedo">
                                    {(field) =>
                                        <field.CheckboxField
                                            label="Re-experience"
                                            labelClassName="font-normal"
                                            onCheckedChange={(checked) => {
                                                if (checked) form.setFieldValue("isCompleted", false);
                                            }}
                                        />
                                    }
                                </form.AppField>
                            </div>

                            <form.AppField name="hidden">
                                {(field) =>
                                    <field.CheckboxField
                                        label="Hidden"
                                        labelClassName="font-medium"
                                        descriptionClassName="text-xs"
                                        className="rounded-md border border-border p-3"
                                        description="Keep this activity editable, but hide it from monthly activity and yearly recap."
                                    />
                                }
                            </form.AppField>
                        </form.FormFieldset>

                        {(updateMutation.isError || deleteMutation.isError) &&
                            <InlineErrorContainer>
                                {displayContainerError({ error: updateMutation.error ?? deleteMutation.error })}
                            </InlineErrorContainer>
                        }
                        <DialogFooter className="pt-2 mx-auto gap-3">
                            <form.Subscribe selector={(state) => state.isSubmitting}>
                                {(isSubmitting) =>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleOnDelete}
                                        disabled={deleteMutation.isPending || isSubmitting}
                                    >
                                        Delete
                                    </Button>
                                }
                            </form.Subscribe>
                            <form.SubmitButton disabled={deleteMutation.isPending} label="Save changes"/>
                        </DialogFooter>
                    </form.FormRoot>
                </form.AppForm>

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
