import {toast} from "@/lib/client/components/ui/toast";
import React, {useId, useState} from "react";
import {Controller, FormProvider, useForm, useWatch} from "react-hook-form";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {handleServerFormErrors} from "@/lib/utils/forms-utils";
import {CircleHelp, Download, TriangleAlert} from "lucide-react";
import {FormError} from "@/lib/client/components/forms/FormError";
import {convertToCsv, saveAsFile} from "@/lib/utils/file-download";
import {ListSettings, mediaListSettingsSchema} from "@/lib/schemas";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {resolveMediaTypeActive} from "@/lib/utils/media-list-activation";
import {ApiProviderType, MediaType, RatingSystemType} from "@/lib/utils/enums";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet} from "@/lib/client/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
import {useDownloadListAsCSVMutation, useListSettingsMutation} from "@/lib/client/react-query/query-mutations/user.mutations";


export const Route = createFileRoute("/_main/_private/settings/_layout/content-lists")({
    component: MediaListFormPage,
});


const mediaTypeConfigs = [
    {
        label: "Anime",
        name: MediaType.ANIME,
    },
    {
        label: "Games",
        name: MediaType.GAMES,
        apiProvider: ApiProviderType.IGDB,
    },
    {
        label: "Books",
        name: MediaType.BOOKS,
        apiProvider: ApiProviderType.BOOKS,
    },
    {
        label: "Manga",
        name: MediaType.MANGA,
        apiProvider: ApiProviderType.MANGA,
    },
];


function MediaListFormPage() {
    const fieldId = useId();
    const { currentUser, setCurrentUser } = useAuth();
    const downloadListAsCSVMutation = useDownloadListAsCSVMutation();
    const listSettingsMutation = useListSettingsMutation({ noErrorToast: true });
    const [selectedListForExport, setSelectedListForExport] = useState<MediaType>(MediaType.SERIES);
    const form = useForm<ListSettings>({
        resolver: zodResolver(mediaListSettingsSchema),
        values: {
            gridListView: currentUser?.gridListView ?? true,
            ratingSystem: currentUser?.ratingSystem ?? RatingSystemType.SCORE,
            searchSelector: currentUser?.searchSelector ?? ApiProviderType.TMDB,
            [MediaType.ANIME]: resolveMediaTypeActive(currentUser?.settings, MediaType.ANIME),
            [MediaType.GAMES]: resolveMediaTypeActive(currentUser?.settings, MediaType.GAMES),
            [MediaType.BOOKS]: resolveMediaTypeActive(currentUser?.settings, MediaType.BOOKS),
            [MediaType.MANGA]: resolveMediaTypeActive(currentUser?.settings, MediaType.MANGA),
        }
    });

    const isGamesActive = useWatch({ control: form.control, name: MediaType.GAMES });
    const isBooksActive = useWatch({ control: form.control, name: MediaType.BOOKS });
    const isMangaActive = useWatch({ control: form.control, name: MediaType.MANGA });

    const viewModeItems = [
        { label: "Grid", value: "grid" },
        { label: "Table", value: "table" },
    ];

    const ratingSystemItems = [
        { label: "Score (numeric)", value: RatingSystemType.SCORE },
        { label: "Feeling (emoticons)", value: RatingSystemType.FEELING },
    ];

    const searchSelectorItems = [
        { label: "Media", value: ApiProviderType.TMDB },
        {
            label: <>{!isBooksActive && <TriangleAlert className="text-warning"/>} Books</>,
            value: ApiProviderType.BOOKS,
        },
        {
            label: <>{!isGamesActive && <TriangleAlert className="text-warning"/>} Games</>,
            value: ApiProviderType.IGDB,
        },
        {
            label: <>{!isMangaActive && <TriangleAlert className="text-warning"/>} Manga</>,
            value: ApiProviderType.MANGA,
        },
        { label: "Users", value: ApiProviderType.USERS },
    ];

    const handleCheckedChange = (field: any, checked: boolean, apiProvider?: ApiProviderType) => {
        field.onChange(checked);
        if (!checked && apiProvider && form.getValues("searchSelector") === apiProvider) {
            form.setValue("searchSelector", ApiProviderType.TMDB, { shouldDirty: true });
        }
    };

    const onSubmit = (submittedData: ListSettings) => {
        listSettingsMutation.mutate({ data: submittedData }, {
            onError: (error) => {
                handleServerFormErrors(form, error);
            },
            onSuccess: async () => {
                await setCurrentUser();
            }
        });
    };

    const handleDownloadCSV = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();

        downloadListAsCSVMutation.mutate({ data: { selectedList: selectedListForExport } }, {
            onSuccess: (data) => {
                if (!data) return;

                try {
                    const formattedData = convertToCsv(data);
                    saveAsFile(formattedData, `mylists-${selectedListForExport}.csv`, "text/csv");
                }
                catch {
                    toast.add({title: "An error occurred while formatting the CSV.", type: "error", priority: "high"});
                }
            }
        });
    };

    const mediaTypesForExport = Object.values(MediaType).map((mediaType) => ({
        label: `${capitalize(mediaType)} List`,
        value: mediaType,
    }));

    return (
        <div className="space-y-6">
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-90 flex-col gap-8 max-sm:w-full">
                    <FieldSet disabled={listSettingsMutation.isPending}>
                        <FieldGroup className="gap-8">
                        <FieldSet>
                            <FieldLegend variant="label">Active Content</FieldLegend>
                            <FieldDescription>
                                    Disabled media are hidden from your profile, stats, feeds, activity, achievements, etc.
                                    Your data are kept and returns if you re-enable it.
                            </FieldDescription>
                            <FieldGroup data-slot="checkbox-group" className="gap-3">
                            {mediaTypeConfigs.map((config) => (
                                <Controller
                                    key={config.name}
                                    name={config.name}
                                    control={form.control}
                                    render={({field, fieldState}) => (
                                        <Field orientation="horizontal" className="justify-between rounded-md border p-3" data-invalid={fieldState.invalid} data-disabled={listSettingsMutation.isPending}>
                                            <FieldLabel htmlFor={`${fieldId}-${config.name}`} className="font-normal">
                                                <MainThemeIcon
                                                    size={15}
                                                    type={config.name}
                                                />
                                                {config.label} List
                                            </FieldLabel>
                                            <Switch
                                                id={`${fieldId}-${config.name}`}
                                                checked={field.value}
                                                aria-invalid={fieldState.invalid}
                                                onCheckedChange={(checked) => handleCheckedChange(field, checked, config.apiProvider)}
                                            />
                                        </Field>
                                    )}
                                />
                            ))}
                            </FieldGroup>
                        </FieldSet>
                            <Controller
                                name="searchSelector"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={listSettingsMutation.isPending}>
                                        <div className="flex items-center gap-2">
                                            <FieldLabel htmlFor={`${fieldId}-search-selector`}>Navbar Search Selector</FieldLabel>
                                            <SearchPopover/>
                                        </div>
                                        <Select
                                            value={field.value}
                                            items={searchSelectorItems}
                                            onValueChange={(value) => {
                                                if (value !== null) field.onChange(value);
                                            }}
                                        >
                                            <SelectTrigger id={`${fieldId}-search-selector`} className="w-full" aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Select a search selector"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {searchSelectorItems.map((item) =>
                                                        <SelectItem
                                                            key={item.value}
                                                            value={item.value}
                                                            disabled={
                                                                (item.value === ApiProviderType.BOOKS && !isBooksActive) ||
                                                                (item.value === ApiProviderType.IGDB && !isGamesActive) ||
                                                                (item.value === ApiProviderType.MANGA && !isMangaActive)
                                                            }
                                                        >
                                                            {item.label}
                                                        </SelectItem>
                                                    )}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                            <Controller
                                name="ratingSystem"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={listSettingsMutation.isPending}>
                                        <div className="flex items-center gap-2">
                                            <FieldLabel htmlFor={`${fieldId}-rating-system`}>Rating System</FieldLabel>
                                            <RatingSystemPopover/>
                                        </div>
                                        <Select
                                            value={field.value}
                                            items={ratingSystemItems}
                                            onValueChange={(value) => {
                                                if (value !== null) field.onChange(value);
                                            }}
                                        >
                                            <SelectTrigger id={`${fieldId}-rating-system`} className="w-full" aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Select a rating system"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {ratingSystemItems.map((item) =>
                                                        <SelectItem key={item.value} value={item.value}>
                                                            {item.label}
                                                        </SelectItem>
                                                    )}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                            <Controller
                                name="gridListView"
                                control={form.control}
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid} data-disabled={listSettingsMutation.isPending}>
                                        <FieldLabel htmlFor={`${fieldId}-grid-list-view`}>Default List View Mode</FieldLabel>
                                        <Select
                                            items={viewModeItems}
                                            value={field.value ? "grid" : "table"}
                                            onValueChange={(value) => {
                                                if (value !== null) field.onChange(value === "grid");
                                            }}
                                        >
                                            <SelectTrigger id={`${fieldId}-grid-list-view`} className="w-full" aria-invalid={fieldState.invalid}>
                                                <SelectValue placeholder="Select a view mode"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {viewModeItems.map((item) =>
                                                        <SelectItem key={item.value} value={item.value}>
                                                            {item.label}
                                                        </SelectItem>
                                                    )}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={[fieldState.error]}/>
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </FieldSet>
                    <FormError/>
                    <FormSubmitButton disabled={!form.formState.isDirty} isLoading={listSettingsMutation.isPending}>
                        Update Settings
                    </FormSubmitButton>
                </form>
            </FormProvider>
            <Separator/>
            <div className="w-90 max-sm:w-full space-y-4">
                <div className="text-base font-medium mb-3">
                    Export Your List as CSV
                    <div className="text-xs font-normal text-muted-foreground">
                        Export each activated list as a CSV file.
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="grow">
                        <Select
                            value={selectedListForExport}
                            items={mediaTypesForExport.map(({ label, value }) => ({
                                value,
                                label: <><MainThemeIcon type={value}/> {label}</>,
                            }))}
                            onValueChange={(value) => {
                                if (value !== null) setSelectedListForExport(value as MediaType);
                            }}
                        >
                            <SelectTrigger id="list-export-select" className="w-40 max-sm:max-w-full">
                                <SelectValue placeholder="Select a media list..."/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    {mediaTypesForExport.map(({ label, value }) => (
                                        <SelectItem key={value} value={value}>
                                            <MainThemeIcon type={value}/> {label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={handleDownloadCSV} disabled={!selectedListForExport || downloadListAsCSVMutation.isPending}>
                        <Download className="size-4"/> Download
                    </Button>
                </div>
                {downloadListAsCSVMutation.isError &&
                    <InlineErrorContainer>
                        Failed to export your list. Please try again later.
                        If the error persists, contact me.
                    </InlineErrorContainer>
                }
            </div>
        </div>
    );
}


const SearchPopover = () => {
    return (
        <Popover>
            <PopoverTrigger className="opacity-50 hover:opacity-80">
                <CircleHelp className="w-4 h-4"/>
            </PopoverTrigger>
            <PopoverContent className="p-5 w-80">
                <div className="mb-3 text-sm font-medium text-muted-foreground">
                    Select your preferred navbar search selector.
                </div>
                <ul className="text-sm list-disc space-y-3 pl-4">
                    <li>
                        <span className="font-semibold">Media (default):</span>
                        {" "}Corresponds to Series, Anime and Movies.
                    </li>
                    <li>
                        <span className="font-semibold">Games/Books/Manga:</span>
                        {" "}Corresponds to their respective type. Requires the corresponding list
                        to be activated.
                    </li>
                </ul>
            </PopoverContent>
        </Popover>
    );
}


const RatingSystemPopover = () => {
    return (
        <Popover>
            <PopoverTrigger className="opacity-50 hover:opacity-80">
                <CircleHelp className="w-4 h-4"/>
            </PopoverTrigger>
            <PopoverContent className="p-5 w-80">
                <div className="mb-3 text-sm font-medium text-muted-foreground">
                    Switch between two rating systems to rate your media.
                </div>
                <ul className="text-sm list-disc space-y-3 pl-4">
                    <li>
                        <span className="font-semibold">Score (default):</span>
                        {" "}Numerical rating from 0 to 10 in 0.5 increments (21 levels).
                    </li>
                    <li>
                        <span className="font-semibold">Feeling:</span>
                        {" "}Emoticon-based rating with 6 different levels.
                    </li>
                </ul>
            </PopoverContent>
        </Popover>
    );
};
