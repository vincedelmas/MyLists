import {useState} from "react";
import {Search} from "lucide-react";
import {useForm} from "react-hook-form";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/lib/client/components/ui/input";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {monthlyActivityMediaSearchOptions} from "@/lib/client/react-query/query-options";
import {getDefaultActivityDate, toActivityStoredValue} from "@/lib/utils/activity-utils";
import {AddMonthlyActivity, AddMonthlyActivityInput, addMonthlyActivitySchema} from "@/lib/schemas";
import {MonthlyActivityFormFields} from "@/lib/client/components/activity/MonthlyActivityFormFields";
import {useAddMonthlyActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface MonthlyActivityAddDialogProps {
    year: number;
    open: boolean;
    month: number;
    mediaTypes: MediaType[];
    onOpenChange: (open: boolean) => void;
}


export const MonthlyActivityAddDialog = ({ open, year, month, mediaTypes, onOpenChange }: MonthlyActivityAddDialogProps) => {
    const addMutation = useAddMonthlyActivityMutation({ noErrorToast: true });
    const [selectedMedia, setSelectedMedia] = useState<{ id: number; name: string; imageCover: string } | null>(null);
    const { search, setSearch, debouncedSearch, isOpen, reset: resetSearch, containerRef } = useSearchContainer({
        onReset: () => undefined,
    });
    const form = useForm<AddMonthlyActivityInput, unknown, AddMonthlyActivity>({
        resolver: zodResolver(addMonthlyActivitySchema),
        defaultValues: {
            mediaId: 0,
            hidden: false,
            redoGained: 0,
            progressGained: 1,
            hadCompletion: false,
            mediaType: mediaTypes[0] ?? MediaType.SERIES,
            lastActivityAt: getDefaultActivityDate(year, month),
        },
    });

    const selectedType = form.watch("mediaType");
    const { data: searchResults = [], isFetching, error } = useQuery(monthlyActivityMediaSearchOptions(selectedType, debouncedSearch));

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

    const handleSubmit = (values: AddMonthlyActivity) => {
        addMutation.mutate({
            data: {
                ...values,
                lastActivityAt: `${values.lastActivityAt}T12:00:00.000Z`,
                progressGained: toActivityStoredValue(values.mediaType, values.progressGained),
            },
        }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: () => {
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[min(620px,calc(100vw-2rem))]">
                <DialogHeader>
                    <DialogTitle>Add monthly activity</DialogTitle>
                    <DialogDescription>
                        Add or correct this media's summary for the selected month.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-2">
                        <fieldset disabled={addMutation.isPending} className="space-y-6">
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
                                                        <MainThemeIcon type={mediaType} className="size-3.5"/>
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
                                                        <div className="flex items-center overflow-hidden focus-within:border-app-accent
                                                        rounded-md border focus-within:ring-2 focus-within:ring-app-accent/50">
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

                            <MonthlyActivityFormFields
                                mediaType={selectedType}
                            />
                        </fieldset>
                        <FormError/>
                        <DialogFooter>
                            <FormSubmitButton isLoading={addMutation.isPending}>
                                Add Monthly Activity
                            </FormSubmitButton>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
