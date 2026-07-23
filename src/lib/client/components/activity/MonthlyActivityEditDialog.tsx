import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form} from "@/lib/client/components/ui/form";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {toDateInputValue} from "@/lib/utils/date-formatting";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {MonthlyActivityEditor} from "@/lib/types/activity.types";
import {FormError} from "@/lib/client/components/forms/FormError";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {toActivityDisplayValue, toActivityStoredValue} from "@/lib/utils/activity-utils";
import {MonthlyActivityFormFields} from "@/lib/client/components/activity/MonthlyActivityFormFields";
import {MonthlyActivityFields, MonthlyActivityFieldsInput, monthlyActivityFieldsSchema} from "@/lib/schemas";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {useRemoveMonthlyActivityMutation, useUpdateMonthlyActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";


interface MonthlyActivityEditDialogProps {
    open: boolean;
    activity: MonthlyActivityEditor;
    onOpenChange: (open: boolean) => void;
}


export const MonthlyActivityEditDialog = ({ open, activity, onOpenChange }: MonthlyActivityEditDialogProps) => {
    const confirm = useConfirm();
    const updateMutation = useUpdateMonthlyActivityMutation({ noErrorToast: true });
    const removeMutation = useRemoveMonthlyActivityMutation({ noErrorToast: true });
    const form = useForm<MonthlyActivityFieldsInput, unknown, MonthlyActivityFields>({
        resolver: zodResolver(monthlyActivityFieldsSchema),
        values: {
            hidden: activity.hidden,
            redoGained: activity.redoGained,
            hadCompletion: activity.hadCompletion,
            lastActivityAt: toDateInputValue(activity.lastActivityAt),
            progressGained: toActivityDisplayValue(activity.mediaType, activity.progressGained),
        },
    });

    const handleOnSave = (data: MonthlyActivityFields) => {
        updateMutation.mutate({
            data: {
                activityId: activity.id,
                payload: {
                    hidden: data.hidden,
                    redoGained: data.redoGained,
                    hadCompletion: data.hadCompletion,
                    lastActivityAt: `${data.lastActivityAt}T12:00:00.000Z`,
                    progressGained: toActivityStoredValue(activity.mediaType, data.progressGained),
                },
            },
        }, {
            onError: (error) => handleServerFormErrors(form, error),
            onSuccess: () => onOpenChange(false),
        });
    };

    const handleOnRemove = async () => {
        if (!await confirm({
            variant: "destructive",
            confirmLabel: "Remove from month",
            title: "Remove this media from the month?",
            description: "Its progress, completion, and redo contributions for this month will be permanently removed.",
        })) return;

        removeMutation.mutate({ data: { activityId: activity.id } }, {
            onError: (error) => handleServerFormErrors(form, error),
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[min(520px,calc(100vw-2rem))]">
                <DialogHeader>
                    <DialogTitle>Edit Monthly Activity — {activity.mediaName}</DialogTitle>
                    <DialogDescription>
                        Progress, completion, and re-experiences can all contribute to the same month.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleOnSave)} className="mt-2 space-y-5">
                        <fieldset disabled={updateMutation.isPending || removeMutation.isPending}>
                            <MonthlyActivityFormFields
                                showHidden
                                movingBetweenMonths
                                mediaType={activity.mediaType}
                            />
                        </fieldset>
                        <FormError/>
                        <DialogFooter className="gap-3">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleOnRemove}
                                disabled={updateMutation.isPending || removeMutation.isPending}
                            >
                                Remove From Month
                            </Button>
                            <FormSubmitButton disabled={removeMutation.isPending} isLoading={updateMutation.isPending}>
                                Save Monthly Activity
                            </FormSubmitButton>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
