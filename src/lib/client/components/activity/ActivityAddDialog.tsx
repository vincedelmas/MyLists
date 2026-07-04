import {useState} from "react";
import {Search} from "lucide-react";
import {useForm} from "react-hook-form";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {Checkbox} from "@/lib/client/components/ui/checkbox";
import {Separator} from "@/lib/client/components/ui/separator";
import {displayContainerError} from "@/lib/utils/error-display";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {AddActivity, AddActivityInput, addActivitySchema} from "@/lib/schemas";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {activityMediaAddSearchOptions} from "@/lib/client/react-query/query-options";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {useAddActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";
import {getActivityInputStep, getActivityUnitLabel, getDefaultActivityDate, toActivityStoredValue} from "@/lib/utils/activity-utils";


interface ActivityAddDialogProps {
    year: number;
    open: boolean;
    month: number;
    mediaTypes: MediaType[];
    onOpenChange: (open: boolean) => void;
}


export const ActivityAddDialog = ({ open, year, month, mediaTypes, onOpenChange }: ActivityAddDialogProps) => {
    const currentDate = useCurrentDate();
    const addMutation = useAddActivityMutation({ noErrorToast: true });
    const [selectedMedia, setSelectedMedia] = useState<{ id: number; name: string; imageCover: string } | null>(null);
    const { search, setSearch, debouncedSearch, isOpen, reset: resetSearch, containerRef } = useSearchContainer({
        onReset: () => undefined,
    });
    const form = useForm<AddActivityInput, unknown, AddActivity>({
        resolver: zodResolver(addActivitySchema),
        defaultValues: {
            mediaId: 0,
            isRedo: false,
            hidden: false,
            specificGained: 1,
            isCompleted: false,
            mediaType: mediaTypes[0] ?? MediaType.SERIES,
            lastUpdate: getDefaultActivityDate(year, month),
        },
    });

    const selectedType = form.watch("mediaType");
    const { data: searchResults = [], isFetching, error } = useQuery(activityMediaAddSearchOptions(selectedType, debouncedSearch));

    const handleTypeChange = (value: MediaType) => {
        resetSearch();
        setSelectedMedia(null);
        form.clearErrors("mediaId");
        form.setValue("mediaId", 0, { shouldDirty: true });
        form.setValue("mediaType", value, { shouldDirty: true, shouldValidate: true });
    };

    const handleSelectedMedia = (item: typeof searchResults[number]) => {
        setSelectedMedia({
            id: item.mediaId,
            name: item.mediaName,
            imageCover: item.customCover ?? item.mediaCover,
        });
        form.setValue("mediaId", item.mediaId, { shouldDirty: true, shouldValidate: true });
        resetSearch();
    };

    const handleSubmit = (values: AddActivity) => {
        addMutation.mutate({
            data: {
                ...values,
                isRedo: values.isRedo,
                isCompleted: values.isCompleted,
                lastUpdate: `${values.lastUpdate}T12:00:00.000Z`,
                specificGained: toActivityStoredValue(values.mediaType, values.specificGained),
            },
        }, {
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[min(620px,calc(100vw-2rem))]">
                <DialogHeader>
                    <DialogTitle>Add Activity</DialogTitle>
                    <DialogDescription>
                        Add progress to the selected month's activity.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-2">
                        <FormField
                            name="mediaType"
                            control={form.control}
                            render={({ field }) =>
                                <FormItem className="w-36">
                                    <FormLabel>MediaType</FormLabel>
                                    <Select value={field.value} onValueChange={handleTypeChange}>
                                        <FormControl>
                                            <SelectTrigger className="w-36 capitalize">
                                                <SelectValue/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {mediaTypes.map((mediaType) =>
                                                <SelectItem key={mediaType} value={mediaType} className="capitalize">
                                                    {mediaType}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />
                        <FormField
                            name="mediaId"
                            control={form.control}
                            render={() =>
                                <FormItem>
                                    <FormLabel>Media</FormLabel>
                                    <FormControl>
                                        <div>
                                            {selectedMedia ?
                                                <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <img
                                                            alt="media-cover"
                                                            src={selectedMedia.imageCover}
                                                            className="h-16 w-11 shrink-0 rounded-sm object-cover"
                                                        />
                                                        <div className="min-w-0 max-w-50">
                                                            <div className="truncate font-medium line-clamp-1">
                                                                {selectedMedia.name}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground capitalize">
                                                                {selectedType}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedMedia(null);
                                                            form.clearErrors("mediaId");
                                                            form.setValue("mediaId", 0, { shouldDirty: true });
                                                        }}
                                                    >
                                                        Change
                                                    </Button>
                                                </div>
                                                :
                                                <div ref={containerRef} className="relative">
                                                    <div className="flex items-center overflow-hidden rounded-md border border-border
                                                    focus-within:border-app-accent focus-within:ring-2 focus-within:ring-app-accent/50">
                                                        <div className="px-3 text-muted-foreground">
                                                            <Search className="size-4"/>
                                                        </div>
                                                        <Input
                                                            value={search}
                                                            inputMode="search"
                                                            className="border-none focus-visible:ring-0"
                                                            onChange={(ev) => setSearch(ev.target.value)}
                                                            placeholder={`Search your ${capitalize(selectedType)} list...`}
                                                        />
                                                    </div>
                                                    <SearchContainer
                                                        error={error}
                                                        search={search}
                                                        isOpen={isOpen}
                                                        isPending={isFetching}
                                                        debouncedSearch={debouncedSearch}
                                                        hasResults={searchResults.length > 0}
                                                    >
                                                        <div className="flex max-h-80 flex-col overflow-y-auto">
                                                            {searchResults.map((item) =>
                                                                <div key={item.mediaId}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSelectedMedia(item)}
                                                                        className="w-full text-left hover:bg-popover/70"
                                                                    >
                                                                        <div className="flex items-center gap-3 p-3">
                                                                            <div className="relative shrink-0">
                                                                                <img
                                                                                    alt=""
                                                                                    src={item.customCover ?? item.mediaCover}
                                                                                    className="h-16 w-11 rounded-sm object-cover"
                                                                                />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="line-clamp-2 font-medium">
                                                                                    {item.mediaName}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    In your {capitalize(selectedType)} list
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                    <Separator className="m-0"/>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </SearchContainer>
                                                </div>
                                            }
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            }
                        />

                        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                            <FormField
                                name="specificGained"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem>
                                        <FormLabel>
                                            {getActivityUnitLabel(selectedType, "long") ?? "Units gained"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                ref={field.ref}
                                                name={field.name}
                                                value={field.value}
                                                onBlur={field.onBlur}
                                                step={getActivityInputStep(selectedType)}
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
                                                max={currentDate}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                }
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <FormField
                                name="isCompleted"
                                control={form.control}
                                render={({ field }) =>
                                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
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
                                                checked={field.value}
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

                        {addMutation.isError &&
                            <InlineErrorContainer>
                                {displayContainerError({ error: addMutation.error })}
                            </InlineErrorContainer>
                        }

                        <DialogFooter>
                            <Button type="submit" disabled={addMutation.isPending}>
                                Add New Activity
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
