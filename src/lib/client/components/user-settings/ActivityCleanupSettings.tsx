import {toast} from "sonner";
import {useForm} from "react-hook-form";
import {MediaType} from "@/lib/utils/enums";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {Input} from "@/lib/client/components/ui/input";
import {FormZodError} from "@/lib/utils/error-classes";
import {Button} from "@/lib/client/components/ui/button";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {shiftDateInputValue, toDateInputValue} from "@/lib/utils/date-formatting";
import {useBulkHideActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";


type FormValues = {
    endDate: string;
    startDate: string;
    mediaType: MediaType | "all";
}


export function ActivityCleanupSettings() {
    const mediaType = "all";
    const { currentUser } = useAuth();
    const today = toDateInputValue(new Date());
    const bulkMutation = useBulkHideActivityMutation();
    const accountCreatedAt = currentUser?.createdAt ? toDateInputValue(currentUser.createdAt) : today;
    const availableMediaTypes = currentUser?.settings.filter(s => s.active).map(s => s.mediaType) ?? Object.values(MediaType);
    const form = useForm<FormValues>({
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

    const handleSubmit = (values: FormValues) => {
        const confirmed = window.confirm("Hide matching activity? This keeps the rows editable and reversible.");
        if (!confirmed) return;

        bulkMutation.mutate({
            data: {
                endDate: values.endDate,
                startDate: values.startDate,
                mediaType: values.mediaType === "all" ? undefined : values.mediaType,
            },
        }, {
            onError: (err) => {
                if (err instanceof FormZodError) {
                    err.issues.forEach((issue) => {
                        form.setError(issue.path.join("."), { type: "server", message: issue.message });
                    });
                }
            },
            onSuccess: (result) => {
                toast.success(`Hidden ${result.count} Activit${result.count === 1 ? "y" : "ies"}`);
            },
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="w-90 max-sm:w-full">
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
                                Days since account creation.
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

                    <FormField
                        name="startDate"
                        control={form.control}
                        rules={{ required: "Start date is required." }}
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
                        rules={{ required: "End date is required." }}
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
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-full">
                                            <SelectValue/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        {availableMediaTypes.map((mediaType) =>
                                            <SelectItem key={mediaType} value={mediaType} className="capitalize">
                                                <MainThemeIcon type={mediaType} className="size-3.5"/> {mediaType}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        }
                    />

                    <div className="rounded-md border p-3 text-sm border-app-accent bg-app-accent/10">
                        This is not month-specific. It applies to all activities with a progress date inside the selected range.
                    </div>
                </div>

                <Button type="submit" className="mt-5" disabled={bulkMutation.isPending}>
                    Hide Matching Activity
                </Button>
            </form>
        </Form>
    );
}
