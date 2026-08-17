import {useId, useState} from "react";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {zodResolver} from "@hookform/resolvers/zod";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {FormError} from "@/lib/client/components/forms/FormError";
import {Controller, FormProvider, useForm} from "react-hook-form";
import {SearchInput} from "@/lib/client/components/general/SearchInput";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {monthlyActivityMediaSearchOptions} from "@/lib/client/react-query/query-options";
import {getDefaultActivityDate, toActivityStoredValue} from "@/lib/utils/activity-utils";
import {createMediaSelectItems} from "@/lib/client/components/general/media-type-options";
import {AddMonthlyActivity, AddMonthlyActivityInput, addMonthlyActivitySchema} from "@/lib/schemas";
import {MonthlyActivityFormFields} from "@/lib/client/components/activity/MonthlyActivityFormFields";
import {useAddMonthlyActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
import {Field, FieldError, FieldGroup, FieldLabel, FieldSet, FieldTitle} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/lib/client/components/ui/dialog";


interface MonthlyActivityAddDialogProps {
    year: number;
    open: boolean;
    month?: number;
    mediaTypes: MediaType[];
    onOpenChange: (open: boolean) => void;
}


export const MonthlyActivityAddDialog = ({ open, year, month, mediaTypes, onOpenChange }: MonthlyActivityAddDialogProps) => {
    const fieldId = useId();
    const mediaTypeItems = createMediaSelectItems(mediaTypes);
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
            lastActivityAt: month ? getDefaultActivityDate(year, month) : "",
        },
    });

    const selectedType = form.watch("mediaType");
    const { data: searchResults = [], isFetching, error } = useQuery(monthlyActivityMediaSearchOptions(selectedType, debouncedSearch));


    const handleTypeChange = (value: MediaType | null) => {
        if (value === null) return;
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
                        {month
                            ? "Add or correct this media's summary for the selected month."
                            : `Choose an activity date in ${year} to select the month.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-2 flex flex-col gap-6">
                        <FieldSet disabled={addMutation.isPending}>
                            <FieldGroup>
                                <Controller
                                    name="mediaType"
                                    control={form.control}
                                    render={({ field, fieldState }) =>
                                        <Field className="w-36" data-invalid={fieldState.invalid} data-disabled={addMutation.isPending}>
                                            <FieldLabel htmlFor={`${fieldId}-media-type`}>Media Type</FieldLabel>
                                            <Select items={mediaTypeItems} value={field.value} onValueChange={handleTypeChange}>
                                                <SelectTrigger
                                                    id={`${fieldId}-media-type`}
                                                    className="w-36 capitalize"
                                                    aria-invalid={fieldState.invalid}
                                                >
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
                                <Controller
                                    name="mediaId"
                                    control={form.control}
                                    render={({ fieldState }) =>
                                        <Field data-invalid={fieldState.invalid} data-disabled={addMutation.isPending}>
                                            <FieldTitle id={`${fieldId}-media-label`}>Media</FieldTitle>
                                            <div aria-labelledby={`${fieldId}-media-label`}>
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
                                                        <SearchInput
                                                            value={search}
                                                            id={`${fieldId}-media-search`}
                                                            aria-invalid={fieldState.invalid}
                                                            aria-labelledby={`${fieldId}-media-label`}
                                                            onChange={(ev) => setSearch(ev.target.value)}
                                                            placeholder={`Search your ${capitalize(selectedType)} list...`}
                                                        />
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
                                            <FieldError errors={[fieldState.error]}/>
                                        </Field>
                                    }
                                />

                                <MonthlyActivityFormFields
                                    restrictToYear={year}
                                    mediaType={selectedType}
                                />
                            </FieldGroup>
                        </FieldSet>
                        <FormError/>
                        <DialogFooter>
                            <FormSubmitButton isLoading={addMutation.isPending}>
                                Add Monthly Activity
                            </FormSubmitButton>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
};
