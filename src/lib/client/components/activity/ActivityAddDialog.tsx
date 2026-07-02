import {useState} from "react";
import {Search} from "lucide-react";
import {MediaType} from "@/lib/utils/enums";
import {useQuery} from "@tanstack/react-query";
import {useSelector} from "@tanstack/react-store";
import {addActivityFormSchema} from "@/lib/schemas";
import {Input} from "@/lib/client/components/ui/input";
import {capitalize} from "@/lib/utils/text-formatting";
import {Button} from "@/lib/client/components/ui/button";
import {ValidationError} from "@/lib/utils/error-classes";
import {useCurrentDate} from "@/lib/client/hooks/use-dates";
import {useAppForm} from "@/lib/client/components/forms/form";
import {Separator} from "@/lib/client/components/ui/separator";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {useSearchContainer} from "@/lib/client/hooks/use-search-container";
import {Field, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {SearchContainer} from "@/lib/client/components/general/SearchContainer";
import {activityMediaAddSearchOptions} from "@/lib/client/react-query/query-options";
import {useAddActivityMutation} from "@/lib/client/react-query/query-mutations/activity.mutations";
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
    const addMutation = useAddActivityMutation({ noGlobalErrorToast: true });
    const [selectedMedia, setSelectedMedia] = useState<{ id: number; name: string; imageCover: string } | null>(null);
    const { search, setSearch, debouncedSearch, isOpen, reset: resetSearch, containerRef } = useSearchContainer({
        onReset: () => undefined,
    });
    const form = useAppForm({
        defaultValues: {
            mediaId: 0,
            isRedo: false,
            hidden: false,
            specificGained: 1,
            isCompleted: false,
            mediaType: mediaTypes[0] ?? MediaType.SERIES,
            lastUpdate: getDefaultActivityDate(year, month),
        },
        validators: {
            onSubmit: addActivityFormSchema,
            onSubmitAsync: async ({ value }) => {
                try {
                    await addMutation.mutateAsync({
                        data: {
                            ...value,
                            lastUpdate: `${value.lastUpdate}T12:00:00.000Z`,
                            specificGained: toActivityStoredValue(value.mediaType, value.specificGained),
                        },
                    });
                }
                catch (err) {
                    if (err instanceof ValidationError) {
                        return { fields: { [err.field]: err.message } };
                    }
                }
            },
        },
        onSubmit: () => {
            onOpenChange(false);
        },
    });

    const selectedType = useSelector(form.store, (state) => state.values.mediaType);
    const { data: searchResults = [], isFetching, error } = useQuery(activityMediaAddSearchOptions(selectedType, debouncedSearch));

    const handleTypeChange = () => {
        resetSearch();
        setSelectedMedia(null);
        form.setFieldValue("mediaId", 0);
        clearMediaIdError();
    };

    const clearMediaIdError = () => {
        form.setFieldMeta("mediaId", (meta) => ({
            ...meta,
            errorMap: {
                ...meta.errorMap,
                onSubmit: undefined,
            },
        }));
    };

    const handleSelectedMedia = (item: typeof searchResults[number]) => {
        setSelectedMedia({
            id: item.mediaId,
            name: item.mediaName,
            imageCover: item.customCover ?? item.mediaCover,
        });
        form.setFieldValue("mediaId", item.mediaId);
        clearMediaIdError();
        resetSearch();
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

                <form.AppForm>
                    <form.FormRoot className="space-y-6 mt-2">
                        <form.FormFieldset className="space-y-6">
                            <div className="w-40">
                                <form.AppField name="mediaType">
                                    {(field) =>
                                        <field.SelectField
                                            label="Media type"
                                            className="w-36 capitalize"
                                            onValueChange={handleTypeChange}
                                            options={mediaTypes.map((mediaType) => ({
                                                value: mediaType,
                                                label: (
                                                    <span className="capitalize flex gap-2 items-center">
                                                        <MainThemeIcon type={mediaType} className="size-3.5"/>
                                                        {mediaType}
                                                    </span>
                                                ),
                                            }))}
                                        />
                                    }
                                </form.AppField>
                            </div>

                            <form.AppField name="mediaId">
                                {(field) => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={`${field.name}-search`}>Media</FieldLabel>
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
                                                            form.setFieldValue("mediaId", 0);
                                                            clearMediaIdError();
                                                        }}
                                                    >
                                                        Change
                                                    </Button>
                                                </div>
                                                :
                                                <div ref={containerRef} className="relative">
                                                    <div className="flex items-center overflow-hidden rounded-md border border-border
                                                    focus-within:border-app-accent focus-within:ring-app-accent/50">
                                                        <div className="px-3 text-muted-foreground">
                                                            <Search className="size-4"/>
                                                        </div>
                                                        <Input
                                                            value={search}
                                                            inputMode="search"
                                                            aria-invalid={isInvalid}
                                                            onBlur={field.handleBlur}
                                                            id={`${field.name}-search`}
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
                                            {isInvalid &&
                                                <FieldError
                                                    errors={field.state.meta.errors}
                                                />
                                            }
                                        </Field>
                                    );
                                }}
                            </form.AppField>

                            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                                <form.AppField name="specificGained">
                                    {(field) =>
                                        <field.NumberField
                                            step={getActivityInputStep(selectedType)}
                                            label={getActivityUnitLabel(selectedType, "long") ?? "Units gained"}
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
                            </div>

                            <div className="space-y-2">
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
                                            label="Re-experienced"
                                            labelClassName="font-normal"
                                            onCheckedChange={(checked) => {
                                                if (checked) form.setFieldValue("isCompleted", false);
                                            }}
                                        />
                                    }
                                </form.AppField>
                            </div>
                        </form.FormFieldset>
                        <form.FormError/>
                        <DialogFooter>
                            <form.SubmitButton
                                label="Add New Activity"
                            />
                        </DialogFooter>
                    </form.FormRoot>
                </form.AppForm>
            </DialogContent>
        </Dialog>
    );
};
