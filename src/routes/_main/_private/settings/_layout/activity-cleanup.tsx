import {toast} from "sonner";
import {useForm} from "react-hook-form";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {useConfirm} from "@/lib/client/hooks/use-confirm";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {getActiveMediaTypes} from "@/lib/utils/media-list-activation";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";
import {BulkHideActivity, BulkHideActivityInput, bulkHideActivitySchema} from "@/lib/schemas";
import {useBulkHideActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import React from "react";


export const Route = createFileRoute("/_main/_private/settings/_layout/activity-cleanup")({
    component: ActivityCleanupSettings,
});


function ActivityCleanupSettings() {
    const mediaType = "all";
    const confirm = useConfirm();
    const { currentUser } = useAuth();
    const today = toDateInputValue(new Date());
    const bulkMutation = useBulkHideActivityMutation({ noErrorToast: true });
    const accountCreatedAt = currentUser?.createdAt ? toDateInputValue(currentUser.createdAt) : today;
    const availableMediaTypes = currentUser ? getActiveMediaTypes(currentUser.settings) : Object.values(MediaType);
    const form = useForm<BulkHideActivityInput, unknown, BulkHideActivity>({
        resolver: zodResolver(bulkHideActivitySchema),
        values: {
            mediaType,
            startDate: accountCreatedAt,
            endDate: shiftDateInputValue(accountCreatedAt, { days: 60, max: today }),
        },
    });

    const mediaTypeItems = [
        {
            value: "all",
            label: (
                <div className="flex items-center gap-2">
                    <MainThemeIcon type="all"/>
                    <span>All Types</span>
                </div>
            ),
        },
        ...availableMediaTypes.map((mediaType) => ({
            value: mediaType,
            label: <><MainThemeIcon type={mediaType} className="size-3.5"/> {mediaType}</>,
        })),
    ];

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
                toast.success(`Hidden ${result.count} Activit${result.count === 1 ? "y" : "ies"}`);
            },
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="w-100 max-sm:w-full space-y-6">
                <fieldset disabled={bulkMutation.isPending} className="space-y-6">
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
                            <Button type="button" variant="outline" onClick={() => applyPreset(30)}>
                                30 days
                            </Button>
                            <Button type="button" variant="outline" onClick={() => applyPreset(60)}>
                                60 days
                            </Button>
                            <Button type="button" variant="outline" onClick={() => applyPreset(90)}>
                                90 days
                            </Button>
                        </div>
                    </div>
                    <FormField
                        name="startDate"
                        control={form.control}
                        render={({ field }) =>
                            <FormItem>
                                <FormLabel>Start date</FormLabel>
                                <FormControl>
                                    <Input type="date" max={today} {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        }
                    />
                    <FormField
                        name="endDate"
                        control={form.control}
                        render={({ field }) =>
                            <FormItem>
                                <FormLabel>End date</FormLabel>
                                <FormControl>
                                    <Input type="date" max={today} {...field}/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        }
                    />
                    <FormField
                        name="mediaType"
                        control={form.control}
                        render={({ field }) =>
                            <FormItem>
                                <FormLabel>Media type</FormLabel>
                                <Select
                                    items={mediaTypeItems}
                                    value={field.value ?? "all"}
                                    onValueChange={(value) => {
                                        if (value !== null) field.onChange(value);
                                    }}
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-full capitalize">
                                            <SelectValue/>
                                        </SelectTrigger>
                                    </FormControl>
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
                                <FormMessage/>
                            </FormItem>
                        }
                    />
                    <div className="rounded-md border p-3 text-sm border-app-accent bg-app-accent/10">
                        This is not month-specific. It applies to all activities with a progress date inside the selected range.
                    </div>
                </fieldset>
                <FormError/>
                <FormSubmitButton isLoading={bulkMutation.isPending}>
                    Hide Matching Activity
                </FormSubmitButton>
            </form>
        </Form>
    );
}
