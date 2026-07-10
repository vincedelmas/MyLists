import {toast} from "sonner";
import React, {useState} from "react";
import {useForm, useWatch} from "react-hook-form";
import {useAuth} from "@/lib/client/hooks/use-auth";
import {zodResolver} from "@hookform/resolvers/zod";
import {capitalize} from "@/lib/utils/text-formatting";
import {createFileRoute} from "@tanstack/react-router";
import {Switch} from "@/lib/client/components/ui/switch";
import {Button} from "@/lib/client/components/ui/button";
import {Separator} from "@/lib/client/components/ui/separator";
import {CircleHelp, Download, TriangleAlert} from "lucide-react";
import {FormError} from "@/lib/client/components/forms/FormError";
import {convertToCsv, saveAsFile} from "@/lib/utils/file-download";
import {ListSettings, mediaListSettingsSchema} from "@/lib/schemas";
import {MainThemeIcon} from "@/lib/client/components/general/MainIcons";
import {handleServerFormErrors} from "@/lib/client/components/forms/forms";
import {ApiProviderType, MediaType, RatingSystemType} from "@/lib/utils/enums";
import {FormSubmitButton} from "@/lib/client/components/forms/FormSubmitButton";
import {InlineErrorContainer} from "@/lib/client/components/general/InlineErrorContainer";
import {Popover, PopoverContent, PopoverTrigger} from "@/lib/client/components/ui/popover";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/lib/client/components/ui/form";
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
    const downloadListAsCSVMutation = useDownloadListAsCSVMutation();
    const listSettingsMutation = useListSettingsMutation({ noErrorToast: true });
    const [selectedListForExport, setSelectedListForExport] = useState<MediaType>(MediaType.SERIES);
    const form = useForm<ListSettings>({
        resolver: zodResolver(mediaListSettingsSchema),
        values: {
            gridListView: currentUser?.gridListView ?? true,
            ratingSystem: currentUser?.ratingSystem ?? RatingSystemType.SCORE,
            searchSelector: currentUser?.searchSelector ?? ApiProviderType.TMDB,
            [MediaType.ANIME]: currentUser?.settings.find(s => s.mediaType === MediaType.ANIME)?.active ?? false,
            [MediaType.GAMES]: currentUser?.settings.find(s => s.mediaType === MediaType.GAMES)?.active ?? false,
            [MediaType.BOOKS]: currentUser?.settings.find(s => s.mediaType === MediaType.BOOKS)?.active ?? false,
            [MediaType.MANGA]: currentUser?.settings.find(s => s.mediaType === MediaType.MANGA)?.active ?? false,
        }
    });

    const isGamesActive = useWatch({ control: form.control, name: MediaType.GAMES });
    const isBooksActive = useWatch({ control: form.control, name: MediaType.BOOKS });
    const isMangaActive = useWatch({ control: form.control, name: MediaType.MANGA });

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
                    toast.error("An error occurred while formatting the CSV.");
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="w-90 max-sm:w-full space-y-8">
                    <fieldset disabled={listSettingsMutation.isPending} className="space-y-8">
                        <div className="space-y-3">
                            <div className="text-sm font-medium mb-2">
                                Active Content
                                <div className="text-xs font-normal text-muted-foreground">
                                    Customize which media types you track. Disabling a list hides it from your profile navigation.
                                </div>
                            </div>
                            {mediaTypeConfigs.map((config) => (
                                <FormField
                                    key={config.name}
                                    name={config.name}
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between space-x-3 rounded-md border p-3">
                                            <FormLabel className="font-normal">
                                                <MainThemeIcon
                                                    size={15}
                                                    type={config.name}
                                                />
                                                {config.label} List
                                            </FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={(checked) => handleCheckedChange(field, checked, config.apiProvider)}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <div>
                            <FormField
                                name="searchSelector"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Navbar Search Selector
                                            <SearchPopover/>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a search selector"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={ApiProviderType.TMDB}>
                                                    Media
                                                </SelectItem>
                                                <SelectItem value={ApiProviderType.BOOKS} disabled={!isBooksActive}>
                                                    {!isBooksActive && <TriangleAlert className="text-amber-600"/>} Books
                                                </SelectItem>
                                                <SelectItem value={ApiProviderType.IGDB} disabled={!isGamesActive}>
                                                    {!isGamesActive && <TriangleAlert className="text-amber-600"/>} Games
                                                </SelectItem>
                                                <SelectItem value={ApiProviderType.MANGA} disabled={!isMangaActive}>
                                                    {!isMangaActive && <TriangleAlert className="text-amber-600"/>} Manga
                                                </SelectItem>
                                                <SelectItem value={ApiProviderType.USERS}>
                                                    Users
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div>
                            <FormField
                                name="ratingSystem"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Rating System
                                            <RatingSystemPopover/>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a rating system"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={RatingSystemType.SCORE}>
                                                    Score (numeric)
                                                </SelectItem>
                                                <SelectItem value={RatingSystemType.FEELING}>
                                                    Feeling (emoticons)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div>
                            <FormField
                                name="gridListView"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Default List View Mode</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(v === "grid")} value={field.value ? "grid" : "table"}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a view mode"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="grid">Grid</SelectItem>
                                                <SelectItem value="table">Table</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>
                    <FormError/>
                    <FormSubmitButton disabled={!form.formState.isDirty} isLoading={listSettingsMutation.isPending}>
                        Update Settings
                    </FormSubmitButton>
                </form>
            </Form>
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
