import {toast} from "sonner";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {FieldGroup} from "@/lib/client/components/ui/field";
import {useAppForm} from "@/lib/client/components/forms/form";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {BulkHideActivityInput, bulkHideActivitySchema} from "@/lib/schemas";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";
import {useBulkHideActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/activity-cleanup")({
    component: ActivityCleanupSettings,
});


function ActivityCleanupSettings() {
    const mediaType = "all";
    const { currentUser } = useAuth();
    const today = toDateInputValue(new Date());
    const bulkMutation = useBulkHideActivityMutation();
    const accountCreatedAt = currentUser?.createdAt ? toDateInputValue(currentUser.createdAt) : today;
    const availableMediaTypes = currentUser?.settings.filter(s => s.active).map(s => s.mediaType) ?? Object.values(MediaType);
    const form = useAppForm({
        defaultValues: {
            mediaType,
            startDate: accountCreatedAt,
            endDate: shiftDateInputValue(accountCreatedAt, { days: 60, max: today }),
        } as BulkHideActivityInput,
        validators: {
            onSubmit: bulkHideActivitySchema,
        },
        onSubmit: async ({ value }) => {
            const confirmed = window.confirm("Hide matching activity? This keeps the rows editable and reversible.");
            if (!confirmed) return;

            const submittedData = bulkHideActivitySchema.parse(value);
            const result = await bulkMutation.mutateAsync({ data: submittedData });
            toast.success(`Hidden ${result.count} Activit${result.count === 1 ? "y" : "ies"}`);
        },
    });

    const applyPreset = (days: number) => {
        form.setFieldValue("startDate", accountCreatedAt);
        form.setFieldValue("endDate", shiftDateInputValue(accountCreatedAt, { days, max: today }));
    };

    return (
        <form.AppForm>
            <form.FormRoot className="w-100 max-sm:w-full">
                <form.FormFieldset>
                    <div className="space-y-7">
                        <div className="font-medium text-lg">
                            Cleanup Activity
                            <div className="text-sm font-normal text-muted-foreground">
                                Hide import activity from recap totals without deleting it.
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="text-sm font-medium">
                                Quick ranges
                                <div className="text-xs font-normal text-muted-foreground">
                                    Days since your account creation.
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset(30)}>
                                    30 days
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset(60)}>
                                    60 days
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => applyPreset(90)}>
                                    90 days
                                </Button>
                            </div>
                        </div>
                        <FieldGroup>
                            <form.AppField name="startDate">
                                {(field) =>
                                    <field.TextField
                                        type="date"
                                        max={today}
                                        label="Start date"
                                    />
                                }
                            </form.AppField>
                            <form.AppField name="endDate">
                                {(field) =>
                                    <field.TextField
                                        type="date"
                                        max={today}
                                        label="End date"
                                    />
                                }
                            </form.AppField>
                            <form.AppField name="mediaType">
                                {(field) =>
                                    <field.SelectField
                                        label="Media type"
                                        className="capitalize"
                                        options={[
                                            { value: "all", label: "All types" },
                                            ...availableMediaTypes.map((mt) => ({
                                                value: mt,
                                                label: (
                                                    <>
                                                        <MainThemeIcon type={mt} className="size-3.5"/>
                                                        <span className="capitalize">{mt}</span>
                                                    </>
                                                ),
                                            })),
                                        ]}
                                    />
                                }
                            </form.AppField>
                        </FieldGroup>

                        <div className="rounded-md border p-3 text-sm border-app-accent bg-app-accent/10">
                            This is not month-specific. It applies to all activities with a progress date inside the selected range.
                        </div>
                    </div>
                </form.FormFieldset>
                <form.SubmitButton
                    className="mt-5"
                    label="Hide Matching Activity"
                />
            </form.FormRoot>
        </form.AppForm>
    );
}
