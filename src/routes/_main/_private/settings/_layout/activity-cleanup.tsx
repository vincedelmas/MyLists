import {useId} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "@/lib/client/components/ui/toast";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {ALL_MEDIA_TYPES} from "@/lib/utils/media-mapping";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {ButtonGroup} from "@/lib/client/components/ui/button-group";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {BulkHideActivity, BulkHideActivityInput, bulkHideActivitySchema} from "@/lib/schemas";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet} from "@/lib/client/components/ui/field";
import {useBulkHideActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


export const Route = createFileRoute("/_main/_private/settings/_layout/activity-cleanup")({
    component: ActivityCleanupSettings,
});


function ActivityCleanupSettings() {
    const fieldId = useId();
    const mediaType = "all";
    const confirm = useConfirm();
    const { currentUser } = useAuth();
    const today = toDateInputValue(new Date());

    const bulkMutation = useBulkHideActivityMutation({ noErrorToast: true });
    const accountCreatedAt = currentUser?.createdAt ? toDateInputValue(currentUser.createdAt) : today;

    const availableMediaTypes = currentUser ? getActiveMediaTypes(currentUser.settings) : ALL_MEDIA_TYPES;
    const mediaTypeItems = createMediaSelectItems(availableMediaTypes, { leading: "all", leadingLabel: "All Types" });

    const form = useForm<BulkHideActivityInput, unknown, BulkHideActivity>({
        resolver: zodResolver(bulkHideActivitySchema),
        values: {
            mediaType,
            startDate: accountCreatedAt,
            endDate: shiftDateInputValue(accountCreatedAt, { days: 60, max: today }),
        },
    });

    const applyPreset = (days: number) => {
        form.setValue("startDate", accountCreatedAt, { shouldDirty: true });
        form.setValue("endDate", shiftDateInputValue(accountCreatedAt, { days, max: today }), { shouldDirty: true });
    };

    const handleSubmit = async (values: BulkHideActivity) => {
        if (!await confirm({
            confirmLabel: "Hide Activity",
            title: "Hide Matching Activity?",
            description: "This keeps the rows editable and reversible.",
        })) return;

        bulkMutation.mutate({
            data: {
                endDate: values.endDate,
                startDate: values.startDate,
                mediaType: values.mediaType,
            },
        }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: (result) => {
                toast.add({
                    title: `Hidden ${result.count} Activit${result.count === 1 ? "y" : "ies"}`,
                    type: "success",
                });
            },
        });
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex w-100 flex-col gap-6 max-sm:w-full">
                <FieldSet disabled={bulkMutation.isPending}>
                    <FieldGroup>
                        <div className="font-medium text-lg">
                            Cleanup Activity
                            <div className="text-sm font-normal text-muted-foreground">
                                Hide import activity from recap totals without deleting it.
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="text-sm font-medium">
                                Quick ranges
                                <div className="text-xs font-normal text-muted-foreground">
                                    Days since your account creation.
                                </div>
                            </div>
                            <ButtonGroup className="w-full" aria-label="Quick cleanup ranges">
                                <Button className="flex-1" type="button" variant="outline" onClick={() => applyPreset(30)}>
                                    30 days
                                </Button>
                                <Button className="flex-1" type="button" variant="outline" onClick={() => applyPreset(60)}>
                                    60 days
                                </Button>
                                <Button className="flex-1" type="button" variant="outline" onClick={() => applyPreset(90)}>
                                    90 days
                                </Button>
                            </ButtonGroup>
                        </div>
                        <Controller
                            name="startDate"
                            control={form.control}
                            render={({ field, fieldState }) =>
                                <Field data-invalid={fieldState.invalid} data-disabled={bulkMutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-start-date`}>
                                        Start date
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="date"
                                        max={today}
                                        id={`${fieldId}-start-date`}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            }
                        />
                        <Controller
                            name="endDate"
                            control={form.control}
                            render={({ field, fieldState }) =>
                                <Field data-invalid={fieldState.invalid} data-disabled={bulkMutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-end-date`}>
                                        End date
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        type="date"
                                        max={today}
                                        id={`${fieldId}-end-date`}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            }
                        />
                        <Controller
                            name="mediaType"
                            control={form.control}
                            render={({ field, fieldState }) =>
                                <Field data-invalid={fieldState.invalid} data-disabled={bulkMutation.isPending}>
                                    <FieldLabel htmlFor={`${fieldId}-mt`}>
                                        Media type
                                    </FieldLabel>
                                    <Select
                                        items={mediaTypeItems}
                                        value={field.value ?? "all"}
                                        onValueChange={(value) => {
                                            if (value !== null) field.onChange(value);
                                        }}
                                    >
                                        <SelectTrigger id={`${fieldId}-mt`} className="w-full capitalize" aria-invalid={fieldState.invalid}>
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {mediaTypeItems.map((item) =>
                                                    <SelectItem key={item.value} value={item.value} className="capitalize">
                                                        {item.label}
                                                    </SelectItem>
                                                )}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldError errors={[fieldState.error]}/>
                                </Field>
                            }
                        />
                        <div className="rounded-xl border p-3 text-sm border-brand bg-brand/10">
                            This is not month-specific. It applies to all activities with a progress date inside the selected range.
                        </div>
                    </FieldGroup>
                </FieldSet>
                <FormError/>
                <FormSubmitButton isLoading={bulkMutation.isPending}>
                    Hide Matching Activity
                </FormSubmitButton>
            </form>
        </FormProvider>
    );
}
