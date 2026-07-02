import {toast} from "sonner";
import React, {useState} from "react";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {mediaListSettingsSchema} from "@/lib/schemas";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {Button} from "@/lib/client/components/ui/button";
import {useAppForm} from "@/lib/client/components/forms/form";
import {Separator} from "@/lib/client/components/ui/separator";
import {CircleHelp, Download, TriangleAlert} from "lucide-react";
import {convertToCsv, saveAsFile} from "@/lib/utils/file-download";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {Field, FieldError, FieldLabel} from "@/lib/client/components/ui/field";
import {ApiProviderType, MediaType, RatingSystemType} from "@/lib/utils/enums";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/lib/client/components/ui/select";
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
    const { currentUser, setCurrentUser } = useAuth();
    const listSettingsMutation = useListSettingsMutation();
    const downloadListAsCSVMutation = useDownloadListAsCSVMutation();
    const [selectedListForExport, setSelectedListForExport] = useState<MediaType>(MediaType.SERIES);
    const form = useAppForm({
        defaultValues: {
            gridListView: currentUser?.gridListView ?? true,
            ratingSystem: currentUser?.ratingSystem ?? RatingSystemType.SCORE,
            searchSelector: currentUser?.searchSelector ?? ApiProviderType.TMDB,
            [MediaType.ANIME]: currentUser?.settings.find(s => s.mediaType === MediaType.ANIME)?.active ?? false,
            [MediaType.GAMES]: currentUser?.settings.find(s => s.mediaType === MediaType.GAMES)?.active ?? false,
            [MediaType.BOOKS]: currentUser?.settings.find(s => s.mediaType === MediaType.BOOKS)?.active ?? false,
            [MediaType.MANGA]: currentUser?.settings.find(s => s.mediaType === MediaType.MANGA)?.active ?? false,
        },
        validators: {
            onSubmit: mediaListSettingsSchema,
        },
        onSubmit: async ({ value }) => {
            await listSettingsMutation.mutateAsync({ data: value });
            await setCurrentUser();
            form.reset(value);
        },
    });

    const handleDownloadCSV = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();

        downloadListAsCSVMutation.mutate({ data: { selectedList: selectedListForExport } }, {
            onSuccess: (data) => {
                if (!data) return;

                try {
                    const formattedData = convertToCsv(data);
                    saveAsFile(formattedData, selectedListForExport, "text/csv");
                }
                catch {
                    toast.error("An error occurred while formatting the CSV.");
                }
            }
        });
    };

    const mediaTypesForExport = Object.values(MediaType).map((mediaType) => {
        return ({
            value: mediaType,
            label: `${capitalize(mediaType)} List`,
        });
    });

    return (
        <div className="space-y-6">
            <form.AppForm>
                <form.FormRoot className="w-90 max-sm:w-full space-y-8">
                    <form.FormFieldset className="space-y-8">
                        <div className="space-y-3">
                            <div className="text-sm font-medium mb-4">
                                Active Content
                                <div className="text-xs font-normal text-muted-foreground">
                                    Customize which media types you track.
                                    Disabling a list hides it from your profile navigation.
                                </div>
                            </div>
                            {mediaTypeConfigs.map((config) =>
                                <form.AppField key={config.name} name={config.name}>
                                    {(field) =>
                                        <field.SwitchField
                                            labelClassName="font-normal"
                                            className="rounded-md border p-3"
                                            onCheckedChange={(checked) => {
                                                if (!checked && config.apiProvider && form.getFieldValue("searchSelector") === config.apiProvider) {
                                                    form.setFieldValue("searchSelector", ApiProviderType.TMDB);
                                                }
                                            }}
                                            label={
                                                <>
                                                    <MainThemeIcon size={15} type={config.name}/>
                                                    {config.label} List
                                                </>
                                            }
                                        />
                                    }
                                </form.AppField>
                            )}
                        </div>

                        <form.Subscribe
                            selector={(state) => [
                                state.values[MediaType.BOOKS],
                                state.values[MediaType.GAMES],
                                state.values[MediaType.MANGA],
                            ] as const}
                        >
                            {([isBooksActive, isGamesActive, isMangaActive]) =>
                                <form.AppField name="searchSelector">
                                    {(field) =>
                                        <field.SelectField
                                            label="Navbar Search Selector"
                                            labelAccessory={<SearchPopover/>}
                                            placeholder="Select a search selector"
                                            options={[
                                                { value: ApiProviderType.TMDB, label: "Media" },
                                                {
                                                    disabled: !isBooksActive,
                                                    value: ApiProviderType.BOOKS,
                                                    label: <>{!isBooksActive && <TriangleAlert className="text-amber-600"/>} Books</>,
                                                },
                                                {
                                                    disabled: !isGamesActive,
                                                    value: ApiProviderType.IGDB,
                                                    label: <>{!isGamesActive && <TriangleAlert className="text-amber-600"/>} Games</>,
                                                },
                                                {
                                                    disabled: !isMangaActive,
                                                    value: ApiProviderType.MANGA,
                                                    label: <>{!isMangaActive && <TriangleAlert className="text-amber-600"/>} Manga</>,
                                                },
                                                { value: ApiProviderType.USERS, label: "Users" },
                                            ]}
                                        />
                                    }
                                </form.AppField>
                            }
                        </form.Subscribe>

                        <form.AppField name="ratingSystem">
                            {(field) =>
                                <field.SelectField
                                    label="Rating System"
                                    placeholder="Select a rating system"
                                    labelAccessory={<RatingSystemPopover/>}
                                    options={[
                                        { value: RatingSystemType.SCORE, label: "Score (numeric)" },
                                        { value: RatingSystemType.FEELING, label: "Feeling (emoticons)" },
                                    ]}
                                />
                            }
                        </form.AppField>

                        <form.AppField name="gridListView">
                            {(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                            Default List View Mode
                                        </FieldLabel>
                                        <Select
                                            name={field.name}
                                            value={field.state.value ? "grid" : "table"}
                                            onValueChange={(value) => field.handleChange(value === "grid")}
                                        >
                                            <SelectTrigger
                                                id={field.name}
                                                className="w-full"
                                                aria-invalid={isInvalid}
                                                onBlur={field.handleBlur}
                                            >
                                                <SelectValue placeholder="Select a view mode"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="grid">Grid</SelectItem>
                                                <SelectItem value="table">Table</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {isInvalid &&
                                            <FieldError
                                                errors={field.state.meta.errors}
                                            />
                                        }
                                    </Field>
                                );
                            }}
                        </form.AppField>
                    </form.FormFieldset>
                    <form.SubmitButton
                        requireDirty={true}
                        label="Update Settings"
                    />
                </form.FormRoot>
            </form.AppForm>
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
                        <Select onValueChange={(value) => setSelectedListForExport(value as MediaType)} value={selectedListForExport}>
                            <SelectTrigger id="list-export-select" className="w-40 max-sm:max-w-full">
                                <SelectValue placeholder="Select a media list..."/>
                            </SelectTrigger>
                            <SelectContent>
                                {mediaTypesForExport.map(({ label, value }) => (
                                    <SelectItem key={value} value={value}>
                                        <MainThemeIcon type={value}/> {label}
                                    </SelectItem>
                                ))}
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
            <PopoverTrigger type="button" className="opacity-50 hover:opacity-80">
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
            <PopoverTrigger type="button" className="opacity-50 hover:opacity-80">
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
